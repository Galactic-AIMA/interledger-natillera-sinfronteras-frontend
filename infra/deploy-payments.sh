#!/usr/bin/env bash
# Despliega los pagos (flujos 3 y 4) con AWS CLI: tabla, Lambdas, rutas del API REST (VTL) y stage.
# Idempotente: se puede correr varias veces. Antes de reemplazar el código de cada Lambda publica una
# versión de respaldo (rollback: aws lambda update-alias/… o volver a subir esa versión).
#
# Uso:  AWS_PROFILE=natillera bash infra/deploy-payments.sh
# Requiere: aws cli v2 con sesión (aws login --profile natillera), python, y los zips de
# deploy/payments/dist (npm run build en deploy/payments).
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-2}"
export AWS_PAGER=""
export MSYS_NO_PATHCONV=1  # Git Bash: no convertir "/authorizationType" ni "/payments" en rutas de Windows
ACCOUNT="349607459198"
API_ID="${API_ID:-lofoyfhz52}"
STAGE="${STAGE:-dev}"
AUTHORIZER_NAME="cognito_authorizer"
PAYMENTS_TABLE="natillera-payments"  # payments-history ahora es la tabla de eventos de Duvan (source + id)
USERS_TABLE="user-info"
SECRET_ID="natillera/open-payments-client"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/deploy/payments/dist"
TMP="$(mktemp -d)"
# En Git Bash, ruta C:/… para que la entiendan también python y aws.exe (nativos de Windows).
if command -v cygpath >/dev/null 2>&1; then TMP="$(cygpath -m "$TMP")"; DIST="$(cygpath -m "$DIST")"; fi
trap 'rm -rf "$TMP"' EXIT

PY=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import json' >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Falta Python 3"; exit 1; }
# Rutas para file:// (aws.exe en Windows necesita C:/…).
fpath() { if command -v cygpath >/dev/null 2>&1; then echo "file://$(cygpath -m "$1")"; else echo "file://$1"; fi; }
bpath() { if command -v cygpath >/dev/null 2>&1; then echo "fileb://$(cygpath -m "$1")"; else echo "fileb://$1"; fi; }
log() { echo; echo "== $*"; }

aws sts get-caller-identity --query Account --output text | grep -q "$ACCOUNT" || { echo "Sesión en otra cuenta"; exit 1; }

# ---------------------------------------------------------------- 1. Tabla de pagos (natillera-payments)
log "Tabla $PAYMENTS_TABLE"
if aws dynamodb describe-table --table-name "$PAYMENTS_TABLE" >/dev/null 2>&1; then
  echo "ya existe"
else
  aws dynamodb create-table --table-name "$PAYMENTS_TABLE" --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=paymentId,AttributeType=S AttributeName=author,AttributeType=S AttributeName=createdAt,AttributeType=S \
    --key-schema AttributeName=paymentId,KeyType=HASH \
    --global-secondary-indexes 'IndexName=author-index,KeySchema=[{AttributeName=author,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
    --query 'TableDescription.TableStatus' --output text
  aws dynamodb wait table-exists --table-name "$PAYMENTS_TABLE"
  echo "creada"
fi

log "Política inline pagos-dynamo (el rol ya no tiene PowerUserAccess)"
ROLE_NAME_P="$(aws lambda get-function-configuration --function-name start-payment --query Role --output text)"; ROLE_NAME_P="${ROLE_NAME_P##*/}"
T_ARN="arn:aws:dynamodb:$AWS_REGION:$ACCOUNT:table"
echo "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"Payments\",\"Effect\":\"Allow\",\"Action\":[\"dynamodb:GetItem\",\"dynamodb:PutItem\",\"dynamodb:UpdateItem\",\"dynamodb:Query\"],\"Resource\":[\"$T_ARN/$PAYMENTS_TABLE\",\"$T_ARN/$PAYMENTS_TABLE/index/*\",\"$T_ARN/payments-history\",\"$T_ARN/payments-history/index/*\"]}]}" > "$TMP/pagos-policy.json"
aws iam put-role-policy --role-name "$ROLE_NAME_P" --policy-name pagos-dynamo --policy-document "$(fpath "$TMP/pagos-policy.json")"

# ---------------------------------------------------------------- 2. Lambdas
BASE_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/$STAGE"
# env_file <archivo> <modo> [RETURN_BASE_URL]
env_file() {
  "$PY" - "$1" "$2" "${3:-}" "$SECRET_ID" "$USERS_TABLE" "$PAYMENTS_TABLE" <<'PYEOF'
import json, sys
out, mode, base, secret, users, payments = sys.argv[1:]
v = {"INTEGRATION_MODE": mode, "OP_SECRET_ID": secret, "USER_VIEW_TABLE": users, "PAYMENTS_TABLE": payments,
     "NATILLERA_RECORDS_TABLE": "natillera-records"}  # complete.ts registra los aportes (finish/return)
if base: v["RETURN_BASE_URL"] = base
json.dump({"Variables": v}, open(out, "w"))
PYEOF
}
env_file "$TMP/env-start.json" vtl "$BASE_URL"   # opción B: la billetera vuelve a $BASE_URL/payments/{id}/return
env_file "$TMP/env-vtl.json" vtl
env_file "$TMP/env-proxy.json" proxy
ROLE_ARN="$(aws lambda get-function-configuration --function-name start-payment --query Role --output text)"

deploy_lambda() { # deploy_lambda nombre timeout memoria archivo-env [zip]
  local name="$1" timeout="$2" memory="$3" envf="$4" zip="${5:-$1}"
  log "Lambda $name"
  [ -f "$DIST/$zip.zip" ] || { echo "Falta $DIST/$name.zip (npm run build)"; exit 1; }
  if ! aws lambda get-function-configuration --function-name "$name" >/dev/null 2>&1; then
    aws lambda create-function --function-name "$name" --runtime nodejs22.x --handler index.handler \
      --role "$ROLE_ARN" --zip-file "$(bpath "$DIST/$zip.zip")" --timeout "$timeout" --memory-size "$memory" \
      --environment "$(fpath "$envf")" --query 'FunctionArn' --output text
    aws lambda wait function-active-v2 --function-name "$name"
    echo "creada"
    return
  fi
  local backup
  backup="$(aws lambda publish-version --function-name "$name" --description "respaldo antes de deploy-payments $(date -u +%FT%TZ)" --query Version --output text)"
  echo "respaldo publicado: versión $backup"
  aws lambda update-function-code --function-name "$name" --zip-file "$(bpath "$DIST/$zip.zip")" --query 'CodeSize' --output text
  aws lambda wait function-updated-v2 --function-name "$name"
  aws lambda update-function-configuration --function-name "$name" --handler index.handler --runtime nodejs22.x \
    --timeout "$timeout" --memory-size "$memory" --environment "$(fpath "$envf")" --query 'LastUpdateStatus' --output text
  aws lambda wait function-updated-v2 --function-name "$name"
}
# start-payment = código de Duvan con los [fix] (src/start-payment-duvan.ts). La versión anterior: src/start-payment.ts
deploy_lambda start-payment 25 512 "$TMP/env-start.json" start-payment-duvan
deploy_lambda finish-payment 25 512 "$TMP/env-vtl.json"
deploy_lambda get-payment 10 256 "$TMP/env-vtl.json"
deploy_lambda preview-payment 25 512 "$TMP/env-vtl.json"   # POST /payments/preview (previewQuote)
deploy_lambda return-payment 25 512 "$TMP/env-proxy.json"

# ---------------------------------------------------------------- 3. API Gateway (REST + VTL)
AUTHORIZER_ID="$(aws apigateway get-authorizers --rest-api-id "$API_ID" --query "items[?name=='$AUTHORIZER_NAME'].id" --output text)"
[ -n "$AUTHORIZER_ID" ] || { echo "No existe el autorizador $AUTHORIZER_NAME"; exit 1; }

resource_id() { aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 --query "items[?path=='$1'].id" --output text; }
ensure_resource() { # ensure_resource /payments/{id}/finish
  local path="$1" id
  id="$(resource_id "$path")"
  if [ -z "$id" ]; then
    local parent="${path%/*}"; [ -z "$parent" ] && parent="/"
    local part="${path##*/}"
    id="$(aws apigateway create-resource --rest-api-id "$API_ID" --parent-id "$(ensure_resource "$parent")" --path-part "$part" --query id --output text)"
  fi
  echo "$id"
}

# Plantilla de error: la Lambda falla con "[400] {json}"; se quita el prefijo de 6 caracteres.
ERROR_TEMPLATE='#set($msg = $input.path('"'"'$.errorMessage'"'"'))
$msg.substring(6)'
"$PY" - "$TMP/error-template.json" "$ERROR_TEMPLATE" <<'EOF'
import json, sys
json.dump({"application/json": sys.argv[2]}, open(sys.argv[1], "w"))
EOF

configure_route() { # configure_route METHOD /path lambda "plantilla VTL"
  local method="$1" path="$2" fn="$3" template="$4"
  log "Ruta $method $path → $fn"
  local rid; rid="$(ensure_resource "$path")"

  if aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" >/dev/null 2>&1; then
    aws apigateway update-method --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS op=replace,path=/authorizerId,value="$AUTHORIZER_ID" \
      --query authorizationType --output text
  else
    aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --authorization-type COGNITO_USER_POOLS --authorizer-id "$AUTHORIZER_ID" --query authorizationType --output text
  fi

  "$PY" - "$TMP/req-template.json" "$template" <<'EOF'
import json, sys
json.dump({"application/json": sys.argv[2]}, open(sys.argv[1], "w"))
EOF
  aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
    --type AWS --integration-http-method POST \
    --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:$ACCOUNT:function:$fn/invocations" \
    --passthrough-behavior NEVER --request-templates "$(fpath "$TMP/req-template.json")" --query passthroughBehavior --output text

  local existing; existing="$(aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" --query 'keys(methodResponses||`{}`)' --output text)"
  for code in 200 400 401 403 404 500 502; do
    if ! grep -qw "$code" <<<"$existing"; then
      aws apigateway put-method-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
        --status-code "$code" --response-models application/json=Empty --query statusCode --output text >/dev/null
    fi
  done
  aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
    --status-code 200 --selection-pattern "" --query statusCode --output text >/dev/null
  for code in 400 401 403 404 500 502; do
    aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --status-code "$code" --selection-pattern "\\[$code\\].*" --response-templates "$(fpath "$TMP/error-template.json")" \
      --query statusCode --output text >/dev/null
  done

  # Permiso para que API Gateway invoque la Lambda en esta ruta ({id} → *).
  local arn_path="${path//\{id\}/*}"
  local sid="apigw-$method-$(echo "$arn_path" | tr -c 'A-Za-z0-9' '-')"
  aws lambda add-permission --function-name "$fn" --statement-id "$sid" --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT:$API_ID/*/$method$arn_path" \
    >/dev/null 2>&1 && echo "permiso de invocación agregado" || echo "permiso de invocación ya existía"
}

# El username se escapa: Cognito admite comillas en el nombre y sin escape se podría inyectar
# otro "username" en el JSON de la plantilla.
AUTH="\"auth\": { \"username\": \"\$util.escapeJavaScript(\$context.authorizer.claims['cognito:username'])\" }"
PID="\"paymentId\": \"\$util.escapeJavaScript(\$input.params('id'))\""
BODY="\"body\": \$input.json('\$')"

configure_route POST /payments              start-payment  "{ $AUTH, $BODY }"
configure_route POST /payments/preview      preview-payment "{ $AUTH, $BODY }"
configure_route GET  /payments              get-payment    "{ $AUTH }"
configure_route GET  /payments/{id}         get-payment    "{ $AUTH, $PID }"
configure_route POST /payments/{id}/finish  finish-payment "{ $AUTH, $PID, $BODY }"

# Opción B: ruta PÚBLICA a la que vuelve la billetera (sin token; el hash protege). Proxy: responde 302.
log "Ruta GET /payments/{id}/return → return-payment (pública, proxy)"
RET_RID="$(ensure_resource "/payments/{id}/return")"
if aws apigateway get-method --rest-api-id "$API_ID" --resource-id "$RET_RID" --http-method GET >/dev/null 2>&1; then
  aws apigateway update-method --rest-api-id "$API_ID" --resource-id "$RET_RID" --http-method GET \
    --patch-operations op=replace,path=/authorizationType,value=NONE --query authorizationType --output text
else
  aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$RET_RID" --http-method GET \
    --authorization-type NONE --query authorizationType --output text
fi
aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$RET_RID" --http-method GET \
  --type AWS_PROXY --integration-http-method POST \
  --uri "arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:$ACCOUNT:function:return-payment/invocations" \
  --query type --output text
aws lambda add-permission --function-name return-payment --statement-id apigw-GET-payments-return \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT:$API_ID/*/GET/payments/*/return" \
  >/dev/null 2>&1 && echo "permiso de invocación agregado" || echo "permiso de invocación ya existía"

# Rutas viejas (antes del contrato): quedan con autorizador y sin passthrough mientras existan.
harden_legacy() {
  local path="$1" rid method
  rid="$(resource_id "$path")"; [ -n "$rid" ] || return 0
  for method in $(aws apigateway get-resource --rest-api-id "$API_ID" --resource-id "$rid" --query 'keys(resourceMethods||`{}`)' --output text); do
    log "Ruta vieja $method $path: autorizador + transferencia del cuerpo NEVER"
    aws apigateway update-method --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS op=replace,path=/authorizerId,value="$AUTHORIZER_ID" \
      --query authorizationType --output text
    aws apigateway update-integration --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --patch-operations op=replace,path=/passthroughBehavior,value=NEVER --query passthroughBehavior --output text
    # Escapar el username en la plantilla existente (misma inyección que en las rutas nuevas).
    aws apigateway get-integration --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --query 'requestTemplates' --output json > "$TMP/legacy.json"
    if "$PY" - "$TMP/legacy.json" <<'EOF'
import json, sys
p = sys.argv[1]
t = json.load(open(p)) or {}
raw = "$context.authorizer.claims['cognito:username']"
esc = "$util.escapeJavaScript(" + raw + ")"
changed = False
for k, v in t.items():
    if raw in v and esc not in v:
        t[k] = v.replace(raw, esc); changed = True
json.dump(t, open(p, "w"))
sys.exit(0 if changed else 1)
EOF
    then
      aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
        --type AWS --integration-http-method POST \
        --uri "$(aws apigateway get-integration --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" --query uri --output text)" \
        --passthrough-behavior NEVER --request-templates "$(fpath "$TMP/legacy.json")" --query passthroughBehavior --output text >/dev/null
      echo "plantilla: username escapado"
    fi
  done
}
harden_legacy /start-payment
harden_legacy /get-payment
harden_legacy /finish-payment

# ---------------------------------------------------------------- 4. Implementar
log "Implementar en el stage $STAGE"
aws apigateway create-deployment --rest-api-id "$API_ID" --stage-name "$STAGE" \
  --description "deploy-payments $(date -u +%FT%TZ)" --query id --output text
echo
echo "Listo: $BASE_URL"
