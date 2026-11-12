# Demo dental, versión para anuncio

Segunda versión de la demo de clínicas dentales de Granados AI. Es la página a la que llega
el anuncio de Meta. La demo original (repositorio `demo-clinica-dental`) no se toca.

## Qué agrega esta versión

- Pantalla de bienvenida que continúa el mensaje del anuncio.
- Recorrido guiado de 7 pasos que se puede saltar.
- Botón fijo para agendar una reunión.
- Agenda de lunes a viernes a las 8:00, 9:00, 10:00, 11:00, 12:00, 4:00 y 5:00,
  con horarios que se muestran ocupados.
- Notas de precio: sistema a la medida, WhatsApp, ChatGPT o Claude y asistente de IA.
- Marca de agua y bloqueos básicos contra copia.
- Eventos del Pixel de Meta (PageView, ViewContent, Lead, Schedule).

## Archivos

- `index.html`: la página publicada. No se edita a mano.
- `src/base.html`: la demo original, sin cambios.
- `src/gx.css` y `src/gx.js`: la capa nueva. La configuración está al inicio de `gx.js`.
- `build.py`: arma `index.html` con `python3 build.py`.
- `google-apps-script/Code.gs`: conexión con Google Calendar.
- `CONEXION-CALENDARIO.md`: pasos para conectar el calendario.

## Configuración (inicio de `src/gx.js`)

- `bookingUrl`: URL de la aplicación web de Google Apps Script.
- `pixelId`: ID del Pixel de Meta.
- `slots`, `takenPerDay`, `days`, `leadMin`: horarios y reglas de la agenda.
