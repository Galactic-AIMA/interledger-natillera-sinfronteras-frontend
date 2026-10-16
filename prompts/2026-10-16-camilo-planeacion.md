# Prompts de camilo · 2026-10-16 · sesión de planeación

Herramienta: Claude Code (app de escritorio, modelo Claude Opus 5.5). Copia literal de los mensajes de Camilo en la sesión de planeación, anterior a la instalación del hook (los siguientes quedan en `2026-10-16-camilo.md`). Las respuestas a preguntas de opción múltiple se transcriben como pregunta → respuesta elegida.

## Prompt 1

https://openpayments.dev/es/
https://github.com/interledger/open-payments.git
https://interledger.org/es/hackathon/open-payments/

Recopila toda la información de open payments, estamos en una hackaton vamos a construir una app, natillera sin fronteras 


Entérate de como codear toda la app con esta liberia

Crea un claude.md y un memory.md dentro del wokspace para paralelizar el trabajo

te dejo acá los bocetos de figma

https://www.figma.com/design/hK29vkj23AZZXEN7W2hjmA/Natillera-sin-Fronteras-%25C2%25B7-Pantallas-v15?node-id=0-1&t=y8ycekd7L7NOSyCu-0

y este es el enlace de la arquitectura enterate de todo y crea el plan

https://app.diagrams.net/#G11qJbOze6CqI89xld0wgVYxOHT5ZlaYoV#%7B%22pageId%22%3A%22SNsIUlNS-PqjOl9gfjeB%22%7D



Somos 4 integrantes

Ciro y Duvan se encargan de Backend, todo esta en aws


Henry y yo Cami encargados del front y del picth de presentación


Vamos a crear una app movil con react native


revisa todo

/using-superpowers /brainstorming /ui-ux-pro-max 


hazme preguntas estrategicas para lograr el mejor resultado


este es el repo donde vamos a subir todo el front

https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend.git


y el back quedara acá

https://github.com/duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend

## Respuestas a la ronda 1 de preguntas

- ¿Con qué flujo quieren ganar la demo en vivo? → "Las 35 pantallas reales"
- ¿Cómo vamos a mostrar la app en el pitch? → "Expo + Android APK (Recomendado)"
- ¿Cómo trabajamos front mientras el back construye en AWS? → "Contrato OpenAPI + mocks (Recomendado)"
- ¿En qué idioma va el pitch y cuánto tiempo queda? → "Español, < 48 h"

## Respuestas a la ronda 2 de preguntas

- ¿Cómo repartimos las 31 pantallas propias? → "31 navegables, todo real"
- ¿Qué stack eligieron Ciro y Duvan en AWS? → "Lambda + API Gateway + DynamoDB"
- ¿Cómo reviso el diagrama de draw.io (privado)? → "D:\GalacticAIMA\NatilleraSinFronteras\Arquitectura Natilleta sin fronteras-Página-3.drawio.png"
- ¿Qué autenticación usamos? → "amazon cognito y jwt"

## Comentario al plan

Recuerda que en las reglas debemos documentar todo el uso de IA y prompts, como ai_usage.md revisa todo esto para que el equipo siempre lo tenga al día

## Aprobación

(Camilo aprobó el plan en la interfaz de Claude Code.)

## Prompt 2 (después de revisar el scaffold)

Sí, haz el primer commit y el push a main del front y sigue con el carril base (tema, fuentes, componentes, api + mocks).

## Nota

Hubo una segunda sesión de Claude Code en paralelo, también abierta en la carpeta raíz del workspace, que escribió `docs/PLAN.md` y `docs/HENRY.md`. Sus prompts están pendientes de copiarse aquí, literales: el hook solo corre en las sesiones abiertas dentro de `frontend/`.
