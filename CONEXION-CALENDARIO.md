# Conectar la agenda de la demo al calendario de Google

La demo guarda las reuniones en el calendario de contact@granadosai.net por medio de una
aplicación web de Google Apps Script. El código está en `google-apps-script/Code.gs`.

## Pasos (una sola vez)

1. Abra https://script.google.com con la cuenta contact@granadosai.net.
2. Clic en **New project** (Nuevo proyecto).
3. Borre lo que aparece en el editor y pegue todo el contenido de `google-apps-script/Code.gs`.
4. En la barra izquierda, junto a **Services** (Servicios), clic en el **+**.
5. Elija **Google Calendar API** y clic en **Add** (Agregar).
6. Clic en el ícono de guardar (o Cmd+S).
7. Arriba, en el selector de funciones, elija **probar** y clic en **Run** (Ejecutar).
8. Clic en **Review permissions**, elija contact@granadosai.net y clic en **Allow** (Permitir).
9. Arriba a la derecha, clic en **Deploy** y luego **New deployment**.
10. Clic en el engranaje junto a **Select type** y elija **Web app**.
11. En **Execute as** deje **Me**. En **Who has access** elija **Anyone**.
12. Clic en **Deploy** y copie la **Web app URL** (termina en `/exec`).

## Poner la URL en la demo

En `src/gx.js`, dentro de `CFG`, pegue la URL en `bookingUrl` y ejecute `python3 build.py`.
Suba el cambio a GitHub y Vercel publica solo.

## Qué hace

- Lee los horarios ocupados del calendario para no agendar dos cosas a la misma hora.
- Crea la reunión de 30 minutos con enlace de Google Meet.
- Si la persona dio su correo, Google le envía la invitación.
- La descripción del evento trae el nombre, la clínica y el WhatsApp.

## Actualizar el código sin cambiar la URL

1. En script.google.com abra el proyecto y reemplace todo el contenido de `Code.gs`.
2. Guarde. Si el código nuevo usa un permiso nuevo (por ejemplo enviar correos), ejecute
   `probarCorreo` una vez y dé el permiso.
3. **Deploy**, luego **Manage deployments**, el lápiz de la implementación activa,
   **Version: New version** y **Deploy**. Así la URL `/exec` sigue igual.
   (No use "New deployment": eso crea una URL nueva.)

## Avisos

Cada reunión nueva envía un correo a la cuenta dueña del script (o a `NOTIFY_EMAILS`)
con el nombre, la clínica, el WhatsApp con enlace para abrir el chat y el enlace de Meet.
El evento trae recordatorios 1 día, 1 hora y 10 minutos antes.
