# 16 · Correo saliente (SMTP propio)

Remitente: **Ciberan <info.ciberan@gmail.com>**. Hay dos emisores y los dos usan el mismo buzón:

| Qué correo | Quién lo envía | Dónde se configura |
|---|---|---|
| Registro, verificación de cuenta, recuperación de contraseña, cambio de correo | Supabase Auth | Panel de Supabase (paso 2) |
| Avisos de la aplicación (resumen de avisos sin leer) y correo de prueba | La app (`server/utils/mailer.ts`) | Variables de entorno (paso 3) |

Ninguna contraseña va en el código ni en el repositorio: solo en `.env` (ignorado por git), en los secretos del hosting y en el panel de Supabase.

## 1. Contraseña de aplicación de Google (lo hace el titular de la cuenta)

1. Entra en la cuenta `info.ciberan@gmail.com` → Seguridad → activa la **verificación en dos pasos**.
2. Abre <https://myaccount.google.com/apppasswords>, crea una contraseña llamada «Ciberan SMTP» y copia los 16 caracteres.
3. Esa contraseña es la que se usa como `SMTP_PASS` y en Supabase. Nunca la contraseña normal de la cuenta. Si se filtra, se revoca en esa misma página y se crea otra.

## 2. Supabase Auth (registro, verificación, recuperación)

Panel del proyecto → **Authentication → Emails → SMTP Settings** → activar *Custom SMTP*:

- Sender email: `info.ciberan@gmail.com` · Sender name: `Ciberan`
- Host: `smtp.gmail.com` · Port: `465` · Username: `info.ciberan@gmail.com` · Password: la contraseña de aplicación

Después:

- **Authentication → Rate limits**: con SMTP propio el límite de correos por hora deja de ser el mínimo del servicio integrado; súbelo a un valor razonable (p. ej. 30/h).
- **Authentication → URL Configuration**: *Site URL* y *Redirect URLs* deben apuntar al dominio real cuando lo haya (hoy `http://localhost:3000`).
- **Authentication → Emails → Templates**: pegar las plantillas de `supabase/templates/` (mismo diseño que los correos de la app). Para cada una: abrir la plantilla del panel, pegar el asunto de `supabase/templates/README.md` en *Subject*, sustituir todo el *Body* por el contenido del `.html` y guardar. Se regeneran con `npx tsx scripts/build-auth-email-templates.mjs`.
- Si la confirmación de correo está desactivada (*Sign In / Providers → Email → Confirm email*), actívala antes de abrir el registro.

## 3. La aplicación (avisos)

Variables (ver `.env.example`):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465            # 465 = TLS directo · 587 = STARTTLS. Ningún otro se acepta.
SMTP_USER=info.ciberan@gmail.com
SMTP_PASS=               # contraseña de aplicación (secreto)
SMTP_FROM_EMAIL=info.ciberan@gmail.com
SMTP_FROM_NAME=Ciberan
APP_URL=                 # para que los enlaces de los correos sean absolutos
```

Sin `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` el correo queda **apagado**: la app funciona igual y no envía.

Seguridad y errores:

- Conexión siempre cifrada (TLS 1.2 mínimo, certificado verificado). No existe modo sin cifrar.
- `sendMail()` nunca lanza: devuelve `ok`, `skipped` o un código (`auth`, `connection`, `timeout`, `tls`, `rejected`, `rate_limited`, `unknown`). Los fallos temporales se reintentan una vez.
- En los registros solo salen códigos y recuentos: ni direcciones, ni contenido, ni credenciales.
- Los enlaces de los correos solo pueden apuntar a rutas internas de la app; todo el texto variable va escapado.

### Comprobar que funciona

Con sesión en `/admin`:

- `GET /api/admin/mail-status` → si está configurado, con qué cifrado y si el servidor acepta las credenciales (no envía nada).
- `POST /api/admin/mail-test` con `{ "to": "tu@correo" }` → envía un correo de prueba (5 cada 10 min).

### Avisos por correo

`POST /api/notifications/email-dispatch` con `Authorization: Bearer <SYNC_CRON_SECRET>`:

- Toma los avisos **sin leer**, con más de 10 minutos y menos de 24 horas, aún no enviados, y manda **un correo por persona** con todos los suyos.
- Solo a cuentas con el correo confirmado. Cada usuario puede apagarlo en Ajustes → Avisos → «Avisos por correo» (encendido por defecto; respeta además los tipos silenciados, que ni siquiera llegan a crearse).
- Marca `notifications.emailed_at` tras enviar. Si el envío falla, se reintenta en la siguiente pasada; si fallan las credenciales, corta la pasada.
- Máximo 40 destinatarios por pasada.

**No hay ningún cron que la invoque todavía.** Se programa (cada 10–15 min) al elegir hosting. **No programarla mientras existan los perfiles ficticios**: sus direcciones no existen y los rebotes perjudican la reputación del buzón.

Migración: `20261113100000_notification_emails.sql` (solo añade `notifications.emailed_at` y `notification_preferences.email_enabled`; aplicada el 2026-11-12; los avisos anteriores quedaron marcados como enviados).

## Diseño y entrega (que no acaben en spam)

Lo que ya hace el código:

- Un único diseño (`mailLayout` en `server/utils/mail-templates.ts`) con la marca: sin imágenes, fuentes ni recursos externos, con versión de texto equivalente y una sola acción por correo.
- Los avisos llevan enlace de baja firmado en el pie y en las cabeceras `List-Unsubscribe` / `List-Unsubscribe-Post` (baja con un clic cuando `APP_URL` es HTTPS), más `Auto-Submitted: auto-generated`.
- La baja (`/api/notifications/unsubscribe`) no exige sesión: abrir el enlace muestra una confirmación y solo el botón (POST) apaga los avisos. Usa `ADMIN_SESSION_SECRET` para firmar.
- Solo se escribe a correos confirmados, un correo por persona y pasada, y nunca avisos de más de 24 h.

Lo que depende de fuera del código:

- **`APP_URL` debe ser el dominio real con HTTPS.** Un correo con enlaces a `http://localhost` es una señal clara de spam.
- Enviando desde `@gmail.com` por el SMTP de Google, SPF y DKIM los pone Google y pasan. Lo que hunde la reputación son los rebotes y las quejas: no enviar a direcciones inventadas (perfiles ficticios) y no superar el límite diario.
- Para garantías reales hace falta **dominio propio** (p. ej. `hola@ciberan.…`) con SPF, DKIM y DMARC en un servicio transaccional. Solo cambian las variables `SMTP_*` y los datos del panel de Supabase.
- Ningún remitente puede garantizar la bandeja de entrada: los primeros envíos de un buzón nuevo pueden caer en spam hasta que los destinatarios los abren o marcan «no es spam».

## Límites de Gmail

- Unos 500 destinatarios al día por cuenta gratuita; superarlo bloquea el envío 24 h. Vale para el lanzamiento; con volumen real conviene pasar a un servicio transaccional con dominio propio (SPF, DKIM y DMARC), cambiando solo las variables `SMTP_*`.
- El remitente siempre será la cuenta autenticada: Gmail reescribe cualquier otro `From`.

## Pendiente

- [x] Contraseña de aplicación creada y puesta en `.env` y en Supabase (2026-11-12). `mail-status` → conexión ok; `mail-test` entregado a Gmail.
- [ ] Pegar las cinco plantillas de `supabase/templates/` en el panel de Supabase.
- [ ] Probar un registro real y una recuperación de contraseña.
- [ ] Cambiar `ADMIN_PASSWORD` de prueba por una definitiva antes de abrir.
- [ ] Programar `email-dispatch` cuando haya hosting y se hayan borrado los perfiles ficticios.
