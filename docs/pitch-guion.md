# Guion del pitch · 5 minutos · sábado 17/10 12:00

Borrador de Henry (2026-10-16). Pasa a la plantilla oficial de Google Slides; una idea por slide, letra grande. Los tiempos suman 5:00. La demo es **en vivo** con el video de respaldo listo (grabado antes de las 08:00).

| # | Tiempo | Slide | Qué se dice (idea, no leer) |
|---|---|---|---|
| 1 | 0:00–0:30 | **Natillera sin Fronteras** · foto/ilustración del frasco | "En Colombia millones de familias ahorran en natilleras: todos ponen una cuota, el fondo crece y se presta entre ellos. Pero hoy la familia vive repartida: Doña Rosa en Medellín, su hija Luz en Miami, Andrés en Madrid." |
| 2 | 0:30–1:00 | **El problema** · 3 datos | Mandar la cuota desde afuera es caro, lento y a mano (transferencias, comprobantes por WhatsApp, la tesorera llevando un cuaderno). Y muchos socios son adultos mayores: las apps de pagos no están hechas para ellos. |
| 3 | 1:00–1:30 | **La solución** · 3 pantallas | Una app para la natillera familiar: cada quien paga **en su moneda**, la plata llega al fondo **en pesos**, la cuota se puede cobrar sola y el fondo presta con plan de pagos claro. Hablamos de "usted", frases cortas y botón **A+** para agrandar la letra. |
| 4 | 1:30–3:30 | **Demo en vivo** (celular proyectado) | Ver "Camino de la demo" abajo. Narrar en una frase cada paso, sin tecnicismos. |
| 5 | 3:30–4:10 | **Cómo usamos Open Payments** · diagrama de 4 cajas | Incoming payment en la billetera del fondo → quote entre monedas (EUR/USD → COP) → **grant interactivo**: la persona aprueba en su propia billetera → outgoing payment. La cuota automática y las cuotas del préstamo son **grants con límite por intervalo**: se aprueba una vez, se cobra cada periodo sin poder pasarse del tope. La app nunca tiene llaves: todo se firma en el back (AWS Lambda). |
| 6 | 4:10–4:35 | **Inclusión y confianza** | A+ en todas las pantallas, tono "usted", áreas táctiles grandes, contraste AA. Seguridad: la app no firma ni guarda llaves, solo abre la billetera real; enlaces falsos no pueden fingir un "Pago hecho" (auditoría propia). |
| 7 | 4:35–5:00 | **Equipo y cierre** | Camilo, Henry (front) · Duvan, David Ciro (back). "Natillera sin Fronteras: el ahorro de la familia, aunque la familia esté lejos." Gracias. |

## Camino de la demo (2 minutos, ensayado)

| Paso | Pantalla | Quién | Qué mostrar | Frase |
|---|---|---|---|---|
| 1 | 10 Mi natillera | Andrés (EUR) | Frasco, fondo, quién está al día | "Andrés vive en Madrid y le falta su cuota." |
| 2 | 11 Poner la cuota | Andrés | Llega $50.000 · sale 11 € · costo | "Ve cuánto sale en euros y cuánto llega en pesos, antes de pagar." |
| 3 | 28 → Test Wallet | Andrés | Aprobar en **su** billetera | "No le damos la clave a nadie: aprueba en su propia billetera." |
| 4 | 30 → 34 Cuota puesta | Andrés | ✓ y resumen | "Listo: la plata llegó al fondo en pesos." |
| 5 | 10 Mi natillera | — | El aporte en "Lo último que pasó" | "La tesorera ya no lleva cuaderno." |
| 6 | 12 → 14 (si sobra tiempo) | Andrés | "Que se cobre sola" | "Aprueba una vez y cada mes se cobra sola, con tope." |
| Plan B | Modo demo | — | "Empezar con datos de ejemplo" | Si la red o la Test Wallet fallan, el mismo camino corre con datos de ejemplo. |

El pago real que se muestra es el de la cuota (prioridad oficial de la hackatón: solicitud, autorización, ejecución y confirmación). Préstamos y recurrente se muestran en modo demo si el back no alcanza.

## Antes del pitch (checklist)

- [ ] Celular con la app (APK o Expo Go), batería llena, brillo alto, modo no molestar.
- [ ] Sesión iniciada como Andrés; Test Wallet de Andrés con saldo; la del fondo creada.
- [ ] Video de respaldo en el escritorio y en el Drive del equipo.
- [ ] Ensayo con cronómetro ×3 (meta: 4:45).
- [ ] Slides en la plantilla oficial; link de la demo en el Drive; formulario enviado.

## Preguntas probables del jurado

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué no se usa el SDK en la app? | El SDK de Open Payments corre en Node y firma con la llave privada; la llave vive en AWS Secrets Manager, nunca en el teléfono. |
| ¿Qué pasa si la persona rechaza en la billetera? | No sale plata; la app lo dice ("Permiso rechazado") y deja intentar otra vez. |
| ¿Y si se cae la red a mitad del pago? | La app no promete "no salió plata": consulta el estado real y, si no hay respuesta, pide revisar "Sus pagos" antes de repetir. |
| ¿Cómo se calcula el fondo si Open Payments no da saldos? | El back suma aportes y resta préstamos desde sus registros. |
| ¿Quién define la tasa del préstamo? | La natillera (el back); la app solo la muestra. |
