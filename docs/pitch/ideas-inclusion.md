# Ideas para que la app sea superfácil, sobre todo para los mayores

Propuesta del 16/10/2026, a partir del recorrido real de la demo como Andrés (capturas en [pantallas/](pantallas/)). Están ordenadas por **cuándo** conviene hacerlas: antes de la entrega no se toca lo que ya funciona.

La idea de fondo: **Doña Rosa no tiene que aprender la app; la app se adapta a Doña Rosa.** Una sola cosa por pantalla, palabras de la casa, nada que dependa de la memoria y siempre una salida.

## Lo que ya tenemos (y hay que contarlo en el pitch)

| Ya está | Por qué ayuda |
|---|---|
| Tono "usted", frases cortas, sin jerga | Se entiende a la primera |
| Botón **A+** con 3 tamaños en todas las pantallas | Vista cansada |
| Botones de 48 px o más, contraste AA | Dedos menos precisos, poca luz |
| Pantalla 28: tres pasos antes de ir a la billetera | No asusta el salto a "otra app" |
| El costo **antes** de pagar (pantalla 11) | Confianza: sin sorpresas |
| Pantalla 32: "No salió plata" si dice que no | Calma: equivocarse no cuesta |
| "¿A nombre de quién?" | El hijo puede ponerle la cuota a la mamá |
| Estados con texto ("Al día", "Debe cuota"), no solo color | Sirve para daltonismo |

## 1 · Arreglos pequeños, si da el tiempo antes de las 11:00

Solo tocan textos o estilos. Cada uno lo hace quien tenga el carril de esa pantalla.

1. **El frasco se desborda.** En "Mi natillera", con $200.000, la franja verde del frasco se sale por los lados (se ve en `pantallas/10-despues.png`). Justo es la imagen con la que se cierra la demo.
2. **Íconos con palabra.** El ícono de persona arriba en "Mi natillera" no dice qué es. Poner debajo "Mi cuenta". Un ícono solo es una adivinanza.
3. **El A+ que se explique solo.** Cambiar "A+" por "A+ Letra" o mostrar la primera vez un globito: "Toque aquí para ver la letra más grande".
4. **Montos que se lean bien con lector de pantalla.** Que `$50.000` se anuncie como "cincuenta mil pesos" (`accessibilityLabel`).
5. **El botón principal siempre en el mismo lugar**, abajo y del mismo color. Ya pasa casi siempre; revisar las pantallas sueltas.

## 2 · Para decir en el pitch como "lo que sigue" (no construir hoy)

1. **Entrar sin contraseña:** con el número de celular y un código por SMS o WhatsApp, o con la huella. La contraseña es la primera barrera para un adulto mayor.
2. **Botón "Escuchar"** en cada pantalla: la app lee en voz alta lo que dice (por ejemplo con `expo-speech`). Sirve también a quien lee con dificultad.
3. **"Pedirle ayuda a un familiar":** un botón que manda por WhatsApp un mensaje como "Mamá necesita ayuda con la cuota de la natillera".
4. **Modo acompañado:** un hijo de confianza puede ver y poner la cuota de la mamá, con permiso de ella. La app ya tiene la base ("a nombre de quién").
5. **Recordatorios en el idioma de la casa:** "Doña Rosa, mañana es la cuota de la natillera" por WhatsApp, no en correos.
6. **Confirmación que se siente:** vibración y un sonido suave al quedar "Cuota puesta".
7. **Invitar con un QR o un enlace**, en vez de escribir el código ROSA-4821 letra por letra.
8. **Tema de alto contraste** y letra Atkinson Hyperlegible, hecha para baja visión (es el tema "Alto contraste" de la presentación).
9. **"¿Seguro?" en lo que no se deshace,** con el resumen en grande: cuánto sale, cuánto llega y a quién.
10. **Nunca un callejón sin salida:** en cada error, qué pasó y qué hacer ("No hay internet. Su plata está bien. Intente en un rato").

## 3 · Cómo probarlo de verdad (10 minutos, ojalá antes del pitch)

- Darle el celular a **una persona mayor** (un familiar sirve) con una sola instrucción: "Ponga la cuota de la natillera".
- No ayudarle. Anotar dónde duda, qué toca primero y qué palabra no entiende.
- Si se puede, contarlo en el pitch: *"Se la dimos a una señora de 70 años y puso la cuota sola en X minutos."* Pesa más que cualquier diapositiva.

## 4 · La presentación también tiene que ser inclusiva

- **Una idea por diapositiva**, en letra grande. El jurado lee en 3 segundos.
- **Decir en voz alta lo que muestran las imágenes**: "aquí Andrés ve que salen 11 euros con 13". Así lo sigue también quien está lejos de la pantalla.
- **Mostrar el A+ en vivo** en la demo: es el gesto que más se recuerda.
- **No depender del color:** las cifras y los estados también llevan palabra.
- **Ritmo pausado:** el tono que usamos con Doña Rosa sirve con el jurado.

## Cómo usar la presentación ([presentacion.html](presentacion.html))

La diseñamos con las mismas reglas: botones grandes con palabras, ayuda la primera vez y atajos simples.

| Quiero | Hago |
|---|---|
| Pasar o volver | **Siguiente →** / **← Atrás**, flechas, espacio, clicker o deslizar el dedo |
| Pantalla completa | **⛶** o la tecla `F`; los botones se esconden solos |
| Ver qué se dice | **Notas** (`N`): guion y cronómetro |
| Probar otra apariencia | Menú **Tema**: Paleta G, Cálido, Noche, Alto contraste, Sencillo |
| Cambiar textos, imágenes u orden | **✎ Editar** (`E`), o escribir directo sobre la diapositiva |
| Pasarle mis cambios a Camilo | ✎ Editar → **Descargar copia** (.json); él usa **Cargar copia** |
| Subirla al Drive o a Google Slides | **Guardar PDF** (una diapositiva por hoja) |

Los cambios se guardan **solo en ese navegador**. Para no perderlos, descargue la copia.
