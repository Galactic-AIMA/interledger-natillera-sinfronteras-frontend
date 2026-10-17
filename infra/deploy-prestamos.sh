#!/usr/bin/env bash
# Despliega préstamos, fase 1 (flujos 10, 11 y 13 sin Open Payments) con AWS CLI: tabla
# natillera-loan-request con sus índices, permiso del rol, 5 Lambdas, rutas del API REST (VTL, mismo
# patrón que infra/deploy-natilleras.sh) y stage. Idempotente. No toca las Lambdas de pagos ni del
# bloque A: solo agrega una política inline al rol que ya usan.
#
# Uso:  cd deploy/prestamos && npm install && npm test && npm run build && cd ../..
#       AWS_PROFILE=natillera bash infra/deploy-prestamos.sh
set -euo pipefail

export AWS_REGION="${AWS_REGION:-us-east-2}"
export AWS_PAGER=""
export MSYS_NO_PATHCONV=1  # Git Bash: no convertir "/authorizationType" ni "/loans" en rutas de Windows
ACCOUNT="349607459198"
API_ID="${API_ID:-lofoyfhz52}"
STAGE="${STAGE:-dev}"
AUTHORIZER_NAME="cognito_authorizer"
NATILLERAS_TABLE="natillera-registration"
RECORDS_TABLE="natillera-records"
LOANS_TABLE="natillera-loan-request"
AUTHOR_INDEX="author-index"
NATILLERA_INDEX="natillera-index"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/deploy/prestamos/dist"
TMP="$(mktemp -d)"
if command -v cygpath >/dev/null 2>&1; then TMP="$(cygpath -m "$TMP")"; DIST="$(cygpath -m "$DIST")"; fi
trap 'rm -rf "$TMP"' EXIT

PY=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import json' >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Falta Python 3"; exit 1; }
fpath() { if command -v cygpath >/dev/null 2>&1; then echo "file://$(cygpath -m "$1")"; else echo "file://$1"; fi; }
bpath() { if command -v cygpath >/dev/null 2>&1; then echo "fileb://$(cygpath -m "$1")"; else echo "fileb://$1"; fi; }
log() { echo; echo "== $*"; }

aws sts get-caller-identity --query Account --output text | grep -q "$ACCOUNT" || { echo "Sesión en otra cuenta"; exit 1; }

# ---------------------------------------------------------------- 1. Tabla e índices
log "Tabla $LOANS_TABLE"
if aws dynamodb describe-table --table-name "$LOANS_TABLE" >/dev/null 2>&1; then
  have="$(aws dynamodb describe-table --table-name "$LOANS_TABLE" --query 'Table.KeySchema[].AttributeName' --output text | tr '\t' ' ')"
  [ "$have" = "requestId" ] || { echo "La tabla $LOANS_TABLE existe con llaves '$have' y se esperaba 'requestId'. Revisar antes de seguir."; exit 1; }
  echo "ya existe ($have)"
else
  aws dynamodb create-table --table-name "$LOANS_TABLE" --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=requestId,AttributeType=S --key-schema AttributeName=requestId,KeyType=HASH \
    --query 'TableDescription.TableStatus' --output text
  aws dynamodb wait table-exists --table-name "$LOANS_TABLE"
  echo "creada"
fi

# ensure_index nombre atributo-hash: GSI (hash, createdAt) con proyección ALL. Uno a la vez: DynamoDB no
# deja crear dos índices en la misma actualización.
ensure_index() {
  local idx="$1" hash="$2"
  log "Índice $idx en $LOANS_TABLE ($hash, createdAt)"
  if aws dynamodb describe-table --table-name "$LOANS_TABLE" --query "Table.GlobalSecondaryIndexes[?IndexName=='$idx'].IndexName" --output text | grep -q "$idx"; then
    echo "ya existe"
  else
    aws dynamodb update-table --table-name "$LOANS_TABLE" \
      --attribute-definitions AttributeName="$hash",AttributeType=S AttributeName=createdAt,AttributeType=S \
      --global-secondary-index-updates "[{\"Create\":{\"IndexName\":\"$idx\",\"KeySchema\":[{\"AttributeName\":\"$hash\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
      --query 'TableDescription.TableStatus' --output text
  fi
  for _ in $(seq 1 60); do
    st="$(aws dynamodb describe-table --table-name "$LOANS_TABLE" --query "Table.GlobalSecondaryIndexes[?IndexName=='$idx'].IndexStatus" --output text)"
    [ "$st" = "ACTIVE" ] && { echo "índice ACTIVE"; return; }
    echo "índice $st…"; sleep 5
  done
  echo "El índice $idx no quedó ACTIVE a tiempo"; exit 1
}
ensure_index "$AUTHOR_INDEX" author
ensure_index "$NATILLERA_INDEX" natilleraId

# ---------------------------------------------------------------- 2. Permisos del rol
ROLE_ARN="$(aws lambda get-function-configuration --function-name start-payment --query Role --output text)"
ROLE_NAME="${ROLE_ARN##*/}"
log "Política inline prestamos-dynamo en el rol $ROLE_NAME"
T="arn:aws:dynamodb:$AWS_REGION:$ACCOUNT:table"
"$PY" - "$TMP/policy.json" "$T" "$NATILLERAS_TABLE" "$RECORDS_TABLE" "$LOANS_TABLE" <<'PYEOF'
import json, sys
out, t, nat, rec, loans = sys.argv[1:]
json.dump({"Version": "2012-10-17", "Statement": [
  {"Sid": "ReadNatilleras", "Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
   "Resource": [f"{t}/{nat}", f"{t}/{rec}"]},
  {"Sid": "Loans", "Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
   "Resource": [f"{t}/{loans}", f"{t}/{loans}/index/*"]}]}, open(out, "w"))
PYEOF
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name prestamos-dynamo --policy-document "$(fpath "$TMP/policy.json")"
echo "ok"

# ---------------------------------------------------------------- 3. Lambdas
"$PY" - "$TMP/env.json" "$NATILLERAS_TABLE" "$RECORDS_TABLE" "$LOANS_TABLE" "$AUTHOR_INDEX" "$NATILLERA_INDEX" <<'PYEOF'
import json, sys
out, nat, rec, loans, aidx, nidx = sys.argv[1:]
json.dump({"Variables": {"INTEGRATION_MODE": "vtl", "NATILLERAS_TABLE": nat, "NATILLERA_RECORDS_TABLE": rec,
  "LOAN_REQUESTS_TABLE": loans, "LOAN_AUTHOR_INDEX": aidx, "LOAN_NATILLERA_INDEX": nidx}}, open(out, "w"))
PYEOF

deploy_lambda() { # deploy_lambda nombre timeout
  local name="$1" timeout="$2"
  log "Lambda $name"
  [ -f "$DIST/$name.zip" ] || { echo "Falta $DIST/$name.zip (npm run build en deploy/prestamos)"; exit 1; }
  if ! aws lambda get-function-configuration --function-name "$name" >/dev/null 2>&1; then
    aws lambda create-function --function-name "$name" --runtime nodejs22.x --handler index.handler \
      --role "$ROLE_ARN" --zip-file "$(bpath "$DIST/$name.zip")" --timeout "$timeout" --memory-size 256 \
      --environment "$(fpath "$TMP/env.json")" --query 'FunctionArn' --output text
    aws lambda wait function-active-v2 --function-name "$name"
    echo "creada"
    return
  fi
  local backup
  backup="$(aws lambda publish-version --function-name "$name" --description "respaldo antes de deploy-prestamos $(date -u +%FT%TZ)" --query Version --output text)"
  echo "respaldo publicado: versión $backup"
  aws lambda update-function-code --function-name "$name" --zip-file "$(bpath "$DIST/$name.zip")" --query 'CodeSize' --output text
  aws lambda wait function-updated-v2 --function-name "$name"
  aws lambda update-function-configuration --function-name "$name" --handler index.handler --runtime nodejs22.x \
    --timeout "$timeout" --memory-size 256 --environment "$(fpath "$TMP/env.json")" --query 'LastUpdateStatus' --output text
  aws lambda wait function-updated-v2 --function-name "$name"
}
for fn in simulate-loan list-loan-requests get-my-loans; do deploy_lambda "$fn" 10; done
for fn in request-loan decide-loan; do deploy_lambda "$fn" 15; done

# ---------------------------------------------------------------- 4. API Gateway (REST + VTL)
AUTHORIZER_ID="$(aws apigateway get-authorizers --rest-api-id "$API_ID" --query "items[?name=='$AUTHORIZER_NAME'].id" --output text)"
[ -n "$AUTHORIZER_ID" ] || { echo "No existe el autorizador $AUTHORIZER_NAME"; exit 1; }

resource_id() { aws apigateway get-resources --rest-api-id "$API_ID" --limit 500 --query "items[?path=='$1'].id" --output text; }
ensure_resource() {
  local path="$1" id
  id="$(resource_id "$path")"
  if [ -z "$id" ]; then
    local parent="${path%/*}"; [ -z "$parent" ] && parent="/"
    local part="${path##*/}"
    id="$(aws apigateway create-resource --rest-api-id "$API_ID" --parent-id "$(ensure_resource "$parent")" --path-part "$part" --query id --output text)"
  fi
  echo "$id"
}

ERROR_TEMPLATE='#set($msg = $input.path('"'"'$.errorMessage'"'"'))
$msg.substring(6)'
"$PY" - "$TMP/error-template.json" "$ERROR_TEMPLATE" <<'EOF'
import json, sys
json.dump({"application/json": sys.argv[2]}, open(sys.argv[1], "w"))
EOF

CODES="400 401 403 404 409 500 501 502"
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
  for code in 200 $CODES; do
    if ! grep -qw "$code" <<<"$existing"; then
      aws apigateway put-method-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
        --status-code "$code" --response-models application/json=Empty --query statusCode --output text >/dev/null
    fi
  done
  aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
    --status-code 200 --selection-pattern "" --query statusCode --output text >/dev/null
  for code in $CODES; do
    aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$rid" --http-method "$method" \
      --status-code "$code" --selection-pattern "\\[$code\\].*" --response-templates "$(fpath "$TMP/error-template.json")" \
      --query statusCode --output text >/dev/null
  done

  # Permiso para que API Gateway invoque la Lambda en esta ruta ({requestId} → *).
  local arn_path; arn_path="$(sed -E 's/\{[^}]+\}/*/g' <<<"$path")"
  local sid="apigw-$method-$(echo "$arn_path" | tr -c 'A-Za-z0-9' '-')"
  aws lambda add-permission --function-name "$fn" --statement-id "$sid" --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT:$API_ID/*/$method$arn_path" \
    >/dev/null 2>&1 && echo "permiso de invocación agregado" || echo "permiso de invocación ya existía"
}

# Identidad escapada (mismo motivo que en deploy-payments.sh: evitar inyectar otro "username").
AUTH="\"auth\": { \"username\": \"\$util.escapeJavaScript(\$context.authorizer.claims['cognito:username'])\", \"sub\": \"\$util.escapeJavaScript(\$context.authorizer.claims['sub'])\" }"
BODY="\"body\": \$input.json('\$')"

P_SIM="\"params\": { \"value\": \"\$util.escapeJavaScript(\$input.params('value'))\", \"assetCode\": \"\$util.escapeJavaScript(\$input.params('assetCode'))\", \"assetScale\": \"\$util.escapeJavaScript(\$input.params('assetScale'))\", \"installments\": \"\$util.escapeJavaScript(\$input.params('installments'))\" }"
P_REQ="\"params\": { \"requestId\": \"\$util.escapeJavaScript(\$input.params('requestId'))\" }"

configure_route GET  /loans/simulate                      simulate-loan       "{ $AUTH, $P_SIM }"
configure_route POST /loans/requests                      request-loan        "{ $AUTH, $BODY }"
configure_route GET  /loans/requests                      list-loan-requests  "{ $AUTH }"
configure_route GET  /loans/mine                          get-my-loans        "{ $AUTH }"
configure_route POST /loans/requests/{requestId}/decision decide-loan         "{ $AUTH, $P_REQ, $BODY }"

# ---------------------------------------------------------------- 5. Implementar
log "Implementar en el stage $STAGE"
aws apigateway create-deployment --rest-api-id "$API_ID" --stage-name "$STAGE" \
  --description "deploy-prestamos $(date -u +%FT%TZ)" --query id --output text
echo
echo "Listo: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/$STAGE"
echo "Fase 2 pendiente: repayment-grant y el desembolso al aprobar (Open Payments)."
