#!/usr/bin/env bash
# Permisos mínimos de la Lambda pre-signup en el rol compartido (el rol ya no tiene PowerUserAccess):
# ListUsers en el user pool (rechazar email/teléfono repetidos) y PutItem en user-info (guardar el perfil).
# Uso: AWS_PROFILE=natillera bash infra/policy-presignup.sh
set -euo pipefail
export AWS_REGION="${AWS_REGION:-us-east-2}" AWS_PAGER="" MSYS_NO_PATHCONV=1
ACCOUNT="349607459198"; USER_POOL_ID="us-east-2_2pQzW95IK"
aws sts get-caller-identity --query Account --output text | grep -q "$ACCOUNT" || { echo "Sesión en otra cuenta"; exit 1; }
ROLE="$(aws lambda get-function-configuration --function-name pre-signup --query Role --output text)"; ROLE="${ROLE##*/}"
DOC="{\"Version\":\"2012-10-17\",\"Statement\":[
 {\"Sid\":\"ListUsers\",\"Effect\":\"Allow\",\"Action\":[\"cognito-idp:ListUsers\"],\"Resource\":\"arn:aws:cognito-idp:$AWS_REGION:$ACCOUNT:userpool/$USER_POOL_ID\"},
 {\"Sid\":\"SaveUser\",\"Effect\":\"Allow\",\"Action\":[\"dynamodb:PutItem\"],\"Resource\":\"arn:aws:dynamodb:$AWS_REGION:$ACCOUNT:table/user-info\"}]}"
aws iam put-role-policy --role-name "$ROLE" --policy-name presignup-cognito --policy-document "$DOC"
echo "presignup-cognito ok en $ROLE"
