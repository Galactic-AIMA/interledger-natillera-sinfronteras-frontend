#!/usr/bin/env bash
# Prueba de punta a punta del pago 1 a 1 (P0): login → iniciar → aprobar en la billetera →
# finalizar → consultar. Interactivo: pide usuario y clave (no se muestran) y la URL de retorno.
#
# Uso (Git Bash, CloudShell o Linux/macOS; necesita curl y python3/python):
#   bash scripts/probar-pago.sh
# Variables opcionales:
#   API=https://…/dev  START_PATH=/payments  RETURN_URL=exp://localhost:8081/--/retorno
set -euo pipefail

API="${API:-https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev}"
START_PATH="${START_PATH:-/payments}"
RETURN_URL="${RETURN_URL:-exp://localhost:8081/--/retorno}"
CLIENT_ID="${CLIENT_ID:-20b10a2tnnr69lqlp2sf62orv0}"
COGNITO="https://cognito-idp.us-east-2.amazonaws.com/"
# Primer intérprete que de verdad corre (en Windows `python3` puede ser el alias de la Store).
PY=""
for candidate in python3 python py; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import json' >/dev/null 2>&1; then PY="$candidate"; break; fi
done
[ -n "$PY" ] || { echo "Falta Python 3 en el PATH"; exit 1; }

# Lee un campo de un JSON por stdin: jget '["a"]["b"]'
jget() { "$PY" -c "import sys,json; d=json.load(sys.stdin); print(d$1)"; }
# Muestra un JSON bonito sin tokens.
show() { "$PY" -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))" 2>/dev/null || cat; }
# POST/GET al API, imprime cuerpo y status; deja el cuerpo en $BODY y el status en $STATUS.
call() {
  local method="$1" path="$2" data="${3:-}"
  local out
  if [ -n "$data" ]; then
    out="$(curl -s -w '\n%{http_code}' -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$data")"
  else
    out="$(curl -s -w '\n%{http_code}' -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN")"
  fi
  STATUS="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
  echo "→ $method $path  [HTTP $STATUS]"
  echo "$BODY" | show
}

echo "== 1 · Login en Cognito =="
read -r -p "Usuario: " NAT_USER
read -r -s -p "Clave: " NAT_PASS; echo
LOGIN_BODY="$(NAT_USER="$NAT_USER" NAT_PASS="$NAT_PASS" CLIENT_ID="$CLIENT_ID" "$PY" -c 'import os,json; print(json.dumps({"ClientId":os.environ["CLIENT_ID"],"AuthFlow":"USER_PASSWORD_AUTH","AuthParameters":{"USERNAME":os.environ["NAT_USER"],"PASSWORD":os.environ["NAT_PASS"]}}))')"
unset NAT_PASS
LOGIN="$(curl -s "$COGNITO" -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' -d "$LOGIN_BODY")"
unset LOGIN_BODY
# El API es REST con autorizador Cognito: va el IdToken.
TOKEN="$(echo "$LOGIN" | jget '["AuthenticationResult"]["IdToken"]' 2>/dev/null || true)"
if [ -z "$TOKEN" ]; then echo "Login falló:"; echo "$LOGIN" | show; exit 1; fi
echo "Login OK (IdToken obtenido, no se muestra)."

echo
echo "== 2 · Iniciar pago =="
read -r -p "Wallet que RECIBE (URL https://ilp.interledger-test.dev/…): " RECEIVER
read -r -p "Monto en unidades menores [100 = 1,00]: " VALUE; VALUE="${VALUE:-100}"
read -r -p "assetCode del monto (el de quien paga o el de quien recibe) [EUR]: " ASSET; ASSET="${ASSET:-EUR}"
read -r -p "assetScale [2]: " SCALE; SCALE="${SCALE:-2}"
START_BODY="$(RECEIVER="$RECEIVER" VALUE="$VALUE" ASSET="$ASSET" SCALE="$SCALE" RETURN_URL="$RETURN_URL" "$PY" -c 'import os,json; e=os.environ; print(json.dumps({"kind":"p2p","walletAddress":e["RECEIVER"],"value":e["VALUE"],"assetCode":e["ASSET"],"assetScale":int(e["SCALE"]),"returnUrl":e["RETURN_URL"]}))')"
call POST "$START_PATH" "$START_BODY"
[ "$STATUS" = "200" ] || { echo "No se pudo iniciar el pago."; exit 1; }
PAYMENT_ID="$(echo "$BODY" | jget '["paymentId"]')"
REDIRECT="$(echo "$BODY" | jget '["redirectUrl"]')"

echo
echo "== 3 · Aprobar en la billetera =="
echo "Abre esta URL en el navegador con la sesión de la Test Wallet de QUIEN PAGA y dale Aceptar:"
echo
echo "  $REDIRECT"
echo
echo "La billetera intentará abrir $RETURN_URL?paymentId=…&interact_ref=…&hash=…"
echo "El navegador no puede abrir esa dirección: cópiala de la barra o de la consola (F12)."
read -r -p "Pega la URL de retorno completa: " RETURNED
read -r INTERACT_REF HASH < <(RETURNED="$RETURNED" "$PY" -c '
import os
from urllib.parse import urlsplit, parse_qs
q = parse_qs(urlsplit(os.environ["RETURNED"].strip()).query)
print(q.get("interact_ref", [""])[0] or "-", q.get("hash", [""])[0] or "-")')
if [ "$INTERACT_REF" = "-" ]; then echo "La URL no trae interact_ref (¿se rechazó en la billetera?)."; INTERACT_REF=""; fi
[ "$HASH" = "-" ] && HASH=""

echo
echo "== 4 · Finalizar =="
FINISH_BODY="$(INTERACT_REF="$INTERACT_REF" HASH="$HASH" "$PY" -c 'import os,json; d={"interact_ref":os.environ["INTERACT_REF"]}; h=os.environ["HASH"]; d.update({"hash":h} if h else {}); print(json.dumps(d))')"
call POST "/payments/$PAYMENT_ID/finish" "$FINISH_BODY"

echo
echo "== 5 · Consultar =="
call GET "/payments/$PAYMENT_ID"
call GET "/payments"

unset TOKEN
echo
echo "Listo. Revisa también la Test Wallet: el débito en quien paga y el crédito en quien recibe."
