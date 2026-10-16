# Prompts de camilo · 2026-10-16 · sesión de revisión e integración de Henry (4f8c52a5)

Herramienta: Claude Code (Claude Opus 5.5, escritorio). Sesión abierta en la raíz del workspace, sin el hook; prompts copiados literalmente de la conversación. La contraseña de prueba del prompt 2 se tapó con [REDACTADO] porque los prompts se publican.

## Prompt 1

Bueno, contextualízate todo este proyecto, todo lo que hemos hecho, revisa todas las memorias, en qué punto estamos, además ve y, investiga el, el repo y mira los avances de Henry. Hazme preguntas estratégicas para continuar.

## Prompt 2

Oh, perfecto. Eh, ve al GitHub, toma todas las pantallas y actualízalas en, en el simulador. Eh, deja la aplicación pues como tal lista. 

Y. prueba el curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.SignUp' -d '{"ClientId":"20b10a2tnnr69lqlp2sf62orv0","Username":"prueba1","Password":"[REDACTADO]","UserAttributes":[{"Name":"email","Value":"tu-correo@ejemplo.com"},{"Name":"phone_number","Value":"+573000000001"},{"Name":"custom:walletId","Value":"f9a1abde"}]}'

y aca estan las intrucciones para usar el login Recuerda documentar todo el uso de IA, eh, estar pues al día con las reglas de la hackathon y y hazme preguntas estratégicas para avanzar. Pégale a eso.

## Prompt 3

estas son las intrucciones del login

(Pegó el mensaje del back "Auth de Natillera (Cognito) — cómo usarlo": endpoint `https://cognito-idp.us-east-2.amazonaws.com/`, headers, cuerpos de SignUp e InitiateAuth con ClientId público y contraseña de ejemplo `Clave#2026`, refresh con `REFRESH_TOKEN_AUTH`, tokens en `expo-secure-store` y la tabla de errores. El texto completo está en `docs/API-AUTH.md` de la rama `david` del repo back.)
