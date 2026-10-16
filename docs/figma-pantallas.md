# Pantallas (Figma "Natillera sin Fronteras · Pantallas v15")

Archivo: https://www.figma.com/design/hK29vkj23AZZXEN7W2hjmA · página "Bocetos" · frames de 390×844 (wireframes de baja fidelidad). Textos completos de cada pantalla en `_figma_raw.txt`. Las pantallas marcadas "Billetera" son la Test Wallet real: no se construyen.

Pestañas inferiores: **Mi natillera · Pagar · Ayuda**. Encabezado con título y botón **A+** (agranda el texto). Tono: "usted".

| # | Pantalla | Endpoint / flujo back | Dueño front |
|---|---|---|---|
| 01 | Bienvenida ("Ahorre en familia, aunque vivan en países distintos"; botón "Empezar con datos de ejemplo") | — (activa modo demo) | Camilo |
| 02 | Crear mi cuenta (usuario, contraseña, correo, celular, billetera) | `POST /signup`, `GET /wallets/verify` · flujo 1 | Camilo |
| 03 | Entrar | Cognito InitiateAuth · flujo 2 | Camilo |
| 04 | Su cuenta | `GET /me` | Camilo |
| 05 | Sin natillera (Crear una / Tengo una invitación) | `GET /natilleras/mine` | Camilo |
| 06 | Lo invitaron (Natillera Familia Rosa, cuota $50.000) | `GET /invitations/{code}`, `POST /natilleras/join` · flujo 8 | Camilo |
| 07 | Tengo una invitación (código ROSA-4821) | `POST /natilleras/join` · flujo 8 | Camilo |
| 08 | Crear una natillera (nombre, billetera del fondo, verificar, moneda) | `POST /natilleras` · flujo 7 | Camilo |
| 09 | Invitación (QR, código, enlace) | respuesta de flujo 7 | Camilo |
| 10 | Mi natillera (fondo, su ahorro, estado, Poner la cuota, ¿Quién pone?, Préstamos, Lo último que pasó) | `GET /natilleras/mine` · flujo 13 | Camilo |
| 11 | Poner la cuota (¿a nombre de quién?, resumen llega/sale/costo, "Que se cobre sola") | `POST /payments` kind=aporte · flujos 9+3 | Henry |
| 12 | Activar pagos recurrentes (cada periodo, hasta diciembre, tope por cobro) | `POST /recurring` · flujo 12 | Henry |
| 13 | Billetera · permiso recurrente | Test Wallet | — |
| 14 | Cuota automática activada | flujo 12 (finish) | Henry |
| 15 | ¿Quién pone? (socios, cuánto han puesto, al día / falta N, invitar) | `GET /natilleras/mine` | Camilo |
| 16 | Préstamos · pedir (monto, 2/4/6 cuotas, le llegaría, plan) | `GET /loans/simulate`, `POST /loans/requests` · flujo 10 | Henry |
| 17 | Autorizar el pago del crédito | `POST /loans/requests/{id}/repayment-grant` · flujo 12B | Henry |
| 18 | Billetera · permiso de las cuotas del crédito | Test Wallet | — |
| 19 | Pago del crédito autorizado | flujo 12B (finish) | Henry |
| 20 | Préstamos · esperando a la tesorera | `GET /loans/mine` | Henry |
| 21 | Préstamos · tesorera (aprobar / rechazar) | `GET /loans/requests?status=pending`, `POST …/decision` · flujo 11 | Henry |
| 22 | Billetera del fondo · desembolso | Test Wallet | — |
| 23 | Préstamo desembolsado | flujo 11 (finish) | Henry |
| 24 | Su crédito · plan de pagos (cuotas capital + interés; pagada/pendiente/en mora) | `GET /loans/mine` | Henry |
| 25 | Préstamo rechazado | `GET /loans/mine` | Henry |
| 26 | Pagar (su billetera, ¿a quién?, ¿cuánto?, resumen, Sus pagos) | `GET /accounts`, `POST /payments` kind=p2p, `GET /payments` · flujo 6 | Henry |
| 27 | Guardar una cuenta (billetera + nombre amigable) | `POST /accounts` · flujo 5 | Henry |
| 28 | Antes de la billetera (1. se abre, 2. aprobar, 3. vuelve sola) | usa `redirectUrl` | Henry |
| 29 | Billetera · permiso de un pago | Test Wallet | — |
| 30 | Volviendo de su billetera… (cargando) | `GET /payments/{id}` (polling) · flujo 4 | Henry |
| 31 | Pago hecho ✓ | — | Henry |
| 32 | Permiso rechazado ✕ | — | Henry |
| 33 | Algo falló ! | — | Henry |
| 34 | Cuota puesta ✓ | — | Henry |
| 35 | Ayuda (respuestas fijas: ¿cuánto llevo?, comisión, permiso de la billetera, préstamo) | local, sin back | Camilo |
| 36 | Metas (lista de ahorros y colectas; nueva, sin Figma) | solo front (`goalStore`) | Camilo |
| 37 | Nueva meta (ahorro o colecta, nombre, beneficiario y billetera, monto, fecha; sin Figma) | `GET /wallets/verify` + solo front | Camilo |
| 38 | Detalle de la meta (avance, días, ¿cuánto le toca?, aportar; sin Figma) | colecta: `POST /payments` p2p con `walletAddress`; ahorro: solo front | Camilo |

## Paleta G · Índigo + Bosque

| Token | Hex | Uso |
|---|---|---|
| indigo | #1A1B4B | Texto y botones |
| indigo2 | #3F4C9A | Acentos |
| menta | #A7C9B9 | Fondos suaves |
| mentaOscura | #4F7F6B | Bordes |
| verdeDinero | #2F6F63 | Solo plata que entra o ahorro que crece |
| fondo | #F5F6FA | Fondo de la app |
| gris | #5F626B | Texto secundario |
| alerta | #B5543F | Errores y avisos |
| billetera | #4A0E68 | Pantalla de la billetera |

Tipografías: **Gloock** (títulos) · **Hanken Grotesk** (texto) · **Martian Mono** (montos).
