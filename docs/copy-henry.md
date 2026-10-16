# Revisión de textos (tarea A6) — para `docs/copy-henry.md`

Criterios: tono "usted" en todo, frases cortas (máx. ~12 palabras), nada de jerga (wallet, quote, grant, ILP, backend, tope, capital, mora, desembolso), botones con verbo claro. Fuente: `docs/figma-pantallas.md`, `docs/_figma_raw.txt` y los textos que ya están en `src/`. Sin tocar el Figma.

## Reglas de vocabulario (aplican a toda la app)

| Antes | Usar siempre | Por qué |
|---|---|---|
| crédito / préstamo (mezclados) | **préstamo** | Una sola palabra; "crédito" suena a banco |
| comisión / costo del envío | **costo del envío** | Ya se usa en la pantalla 11 |
| desembolsado | **entregado** | Jerga bancaria |
| en mora | **atrasada** | Jerga bancaria |
| capital / interés | **abono** / **interés** | "Capital" no se entiende; "abono" sí |
| tope | **lo máximo** | "Tope" es técnico |
| recurrente | **automática** | Más claro |
| periodo | **mes** (cuando el back confirme el periodo) | "Periodo" es abstracto |
| sesión | **cuenta** | "Cerrar sesión" confunde |
| "mi" en botones, "su" en etiquetas | Se mantiene | Botón = voz de la persona ("Crear mi cuenta"); etiqueta = "usted" ("Su cuenta") |
| "plata" | Se mantiene | Natural en Colombia y cálido; no mezclar con "dinero" en la misma pantalla |

## Cambios por pantalla

| Pantalla | Texto actual | Texto propuesto | Por qué |
|---|---|---|---|
| 01 Bienvenida | "Ya tengo cuenta" | "Entrar a mi cuenta" | Lleva verbo; "Ya tengo cuenta" no dice qué pasa al tocar |
| 01 Bienvenida | "Empezar con datos de ejemplo" | "Probar con datos de ejemplo" | "Empezar" suena a crear algo real |
| 02 Crear mi cuenta | "Dirección de su billetera" / "Verificamos que la billetera exista." | "Dirección de su billetera" / "Es el enlace que empieza con https://. Revisamos que exista." | Explica qué pegar sin decir "wallet" |
| 04 Su cuenta | "Cerrar sesión" | "Salir de mi cuenta" | "Sesión" es jerga |
| 05 Sin natillera | "Un ahorro en familia: cada periodo todos ponen una cuota." | "Es un ahorro en familia. Cada mes todos ponen una cuota." | Dos frases cortas; "periodo" abstracto (confirmar con el back antes de decir "mes") |
| 05 Sin natillera | "Crear una" | "Crear una natillera" | El botón debe decir qué crea |
| 06 Lo invitaron | "Cuota  $50.000" | "Cuota de cada vez: $50.000" | Aclara que es por pago, no total |
| 06 Lo invitaron | "Unirme" | "Unirme a la natillera" | Verbo + objeto |
| 07 Tengo una invitación | "Unirme" | "Unirme a la natillera" | Igual que 06 |
| 08 Crear una natillera | "La app no crea billeteras: debe existir." | "La app no crea billeteras. La del fondo ya debe existir." | Error de concordancia (plural/singular) |
| 08 Crear una natillera | "Verificar la billetera" | "Revisar la billetera" | "Verificar" es más técnico |
| 08 Crear una natillera | "La moneda la define la billetera del fondo." | "La moneda es la de esa billetera." | Más corta |
| 09 Invitación | alt del QR: "código QR" | "Código QR para invitar a su familia" | Lector de pantalla |
| 10 Mi natillera | "Fondo (suma de aportes)" | "Lo que ahorraron entre todos" | Evita "fondo" y "aportes" |
| 10 Mi natillera | "Su ahorro  Lleva" | "Usted lleva" | Una sola frase |
| 10 Mi natillera | "Estado  Al día" | "Sus cuotas: al día" | "Estado" es genérico |
| 10 Mi natillera | "¿Quién pone?" | "¿Quién ha puesto cuota?" | "¿Quién pone?" no se entiende como lista de socios |
| 10 Mi natillera | "Doña Rosa  +$50.000" | "Doña Rosa puso la cuota  +$50.000" | La fila dice qué pasó |
| 11 Poner la cuota | "Mía" (opción) | "Para mí" | "Mía" suena a pregunta de propiedad |
| 11 Poner la cuota | "Su billetera le pide permiso antes." | "Antes de pagar, su billetera le pedirá permiso." | Más claro y en orden |
| 11 Poner la cuota | "Que se cobre sola" | "Que la cuota se pague sola" | Dice de qué se trata |
| 12 Pagos recurrentes | Título "Pagos recurrentes" y botón "Activar pagos recurrentes" | Título "Cuota automática" y botón "Activar la cuota automática" | "Recurrente" es jerga y la pantalla 14 ya dice "automática" |
| 12 Pagos recurrentes | "Cada  periodo (por confirmar)" | "Cada  mes" (o ocultar la fila hasta confirmar) | "Por confirmar" no debe verse en la demo |
| 12 Pagos recurrentes | "Tope por cobro  11,38 €" | "Lo máximo que se cobra cada vez  11,38 €" | "Tope" es técnico |
| 12 Pagos recurrentes | "1. La app llama al backend / 2. Se abre la billetera para dar el permiso / 3. El backend cobra la cuota en cada periodo" | "1. Se abre su billetera. / 2. Usted da el permiso, una sola vez. / 3. Cada mes la cuota sale sola." | "Backend" y "llama" son jerga; el título "Qué pasa al tocar el botón" se mantiene |
| 14 Cuota automática activada | "Tope por cobro" / "Se repite  24 veces" | "Lo máximo por cobro" / "Se cobrará  24 veces" | Mismo vocabulario que 12 |
| 14 Cuota automática activada | "Desde el próximo periodo se cobra sola." | "Desde la próxima cuota se cobra sola." | Sin "periodo" |
| 15 ¿Quién pone? | "Falta 2" | "Le faltan 2 cuotas" | Frase completa y concordancia |
| 16 Préstamos | "Le llegaría  24,88 US$" | "Usted recibiría  24,88 US$" | Aclara quién recibe |
| 16 Préstamos | "Lo devuelve en  4 cuotas" | "Lo paga en  4 cuotas" | Más natural |
| 17 Autorizar el pago | Título "Autorizar el pago del crédito" | "Permiso para cobrar las cuotas" | Evita "crédito" y "autorizar el pago" |
| 17 Autorizar el pago | "Cada cuota tiene dos partes: interés + abono a capital." | "Cada cuota tiene dos partes: lo que abona al préstamo y un pequeño interés." | "Capital" no se entiende |
| 17 Autorizar el pago | "Cuota más alta  $26.000 (ejemplo)" | "Cuota más alta  $26.000 (es un ejemplo)" | Se ve como aviso, no como error |
| 19 Pago del crédito autorizado | "Cuotas autorizadas" / "Tope por cuota" | "Permiso dado" / "Lo máximo por cuota" | Vocabulario común |
| 20 Préstamos · esperando | "Cuotas autorizadas  Sí" | "Permiso para las cuotas  Dado" | Más claro |
| 21 Tesorera | "Cuotas autorizadas  Sí" / "La natillera tiene  $150.000" | "Permiso para las cuotas  Dado" / "Hay en el fondo  $150.000" | Igual |
| 23 Préstamo desembolsado | Título "Préstamo desembolsado" | "Préstamo entregado" | "Desembolsado" es jerga |
| 24 Su crédito · plan | Título "Su crédito" y "Crédito" | "Su préstamo" | Una sola palabra en toda la app |
| 24 Su crédito · plan | "Capital $25.000 + interés $1.000" | "Abono $25.000 + interés $1.000" | "Capital" es jerga |
| 24 Su crédito · plan | "Estados: pagada, pendiente o en mora." | "Estados: pagada, pendiente o atrasada." | "En mora" es jerga |
| 24 Su crédito · plan | "Valores de ejemplo: la tasa está por confirmar." | "Son valores de ejemplo. El interés final puede cambiar." | Sin "tasa" ni "por confirmar" |
| 25 Préstamo rechazado | "No salió plata y el permiso de las cuotas quedó sin efecto." | "No salió plata. El permiso de las cuotas ya no vale." | Dos frases cortas |
| 26 Pagar | "+ Cuenta nueva" | "Agregar una persona" | "Cuenta" suena a banco; verbo claro |
| 26 Pagar | "Luz · completado" / "Luz · rechazado  $0" | "Luz · enviado" / "Luz · no se envió" | Evita "completado/rechazado" |
| 27 Guardar una cuenta | Título "Guardar cuenta" y botón "Guardar la cuenta" | Título "Guardar a una persona" y botón "Guardar a esta persona" | Coherente con 26 |
| 27 Guardar una cuenta | "Verificar la billetera" | "Revisar la billetera" | Igual que 08 |
| 28 Antes de la billetera | (sin aviso de respaldo) | Añadir al final: "Si no vuelve sola, abra Natillera de nuevo." | Plan B si falla el deep link en real |
| 30 Volviendo | "Estamos confirmando lo que usted decidió." | Mantener, y tras 15 s añadir: "Está tardando un poco. Un momento, por favor." | Evita que parezca congelada |
| 30 Volviendo (sin respuesta tras 45 s) | (no existe) | Título "Todavía no sabemos". Texto: "No vimos que terminara. Revise «Sus pagos» en unos minutos." Botones: "Revisar de nuevo" / "Volver" | Estado `pending` al vencer el tiempo (hallazgo #4) |
| 32 Permiso rechazado | Título "Permiso rechazado" / "No salió plata." | Título "No dio el permiso" / "No salió plata. Si fue sin querer, puede intentarlo de nuevo." | Dice qué hizo la persona y qué sigue |
| 33 Algo falló | Título "Algo falló" / "No salió plata. Puede intentarlo otra vez." | Título "No pudimos hacer el pago" / "No salió plata. Puede intentarlo otra vez." | "Algo falló" asusta y no dice qué |
| 35 Ayuda | "Explícame la comisión" | "Explíqueme el costo del envío" | **Único texto en "tú"**; y "comisión" ≠ "costo del envío" de 11 |
| 35 Ayuda | "Respuestas fijas en la app: no usa backend." | No mostrar (nota interna del boceto) | "Backend" nunca debe verse |
| Mensaje de error (`httpApi.ts:29`, `auth.ts:38`) | "Falta configurar la API (EXPO_PUBLIC_API_URL)." / "Falta configurar Cognito (…CLIENT_ID)." | "No pudimos conectarnos. Intente de nuevo en un momento." | Nombres de variables nunca al usuario |
| Mensaje de error (`httpApi.ts`, genérico) | "Algo falló. Intente de nuevo." | Mantener | Ya está en "usted", corto |
| Botón A+ (`Screen.tsx`) | `accessibilityLabel` "Agrandar la letra" | "Cambiar el tamaño de la letra" | El botón también la vuelve a achicar |
| Diálogo demo (`wallet.ts:34`) | "Billetera de prueba · …" con "Rechazar / Aprobar" | Mantener; en el título añadir "(simulada)" | Deja claro en el pitch que es demo |

## Los cinco con más impacto (para el pitch y el premio de inclusión)

1. **12**: quitar "La app llama al backend" y "pagos recurrentes"; usar los tres pasos en lenguaje de casa y "Cuota automática".
2. **35**: "Explícame la comisión" -> "Explíqueme el costo del envío" (único "tú" de la app y vocabulario de 11).
3. **Préstamos (17, 23, 24)**: una sola palabra ("préstamo"), "entregado", "atrasada" y "abono" en vez de capital/mora/desembolso.
4. **32 y 33**: títulos que dicen qué pasó ("No dio el permiso", "No pudimos hacer el pago") y qué sigue.
5. **28 y 30**: aviso de qué hacer si la billetera no devuelve a la app y mensaje cuando la confirmación tarda; es la parte del camino del pitch donde una persona mayor se pierde.
