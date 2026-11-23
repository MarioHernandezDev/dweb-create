# Seguridad de la cuenta: cambio de contraseña y de email

Pantalla: **Perfil → Privacidad y cuenta → Acceso a la cuenta** (`app/components/profile/AccountAccessCard.vue`), en los dos roles.

## Cómo funciona

**Cambiar la contraseña (dos pasos)**
1. **Contraseña actual.** Se comprueba con un cliente de Supabase aparte (`persistSession: false`), para no renovar la sesión real. Si es correcta se llama a `auth.reauthenticate()`, que envía un **código de 6 dígitos** al correo de la cuenta.
2. **Código + contraseña nueva.** `auth.updateUser({ password, nonce })`. La contraseña nueva se valida con un medidor de fortaleza (`app/utils/password-strength.ts`: rechaza las más comunes, repeticiones, secuencias y el propio nombre/email) y hay una casilla, marcada por defecto, para **cerrar la sesión en los demás dispositivos** (`signOut({ scope: 'others' })`). El reenvío del código tiene una espera de 60 s.

**Cambiar el email.** Pide la contraseña actual; `updateUser({ email })` envía un enlace al correo nuevo y el cambio no se aplica hasta abrirlo (hasta entonces se sigue entrando con el email actual).

## Qué exige el servidor y qué no (importante)

El código del correo **solo lo exige Supabase si el ajuste «Secure password change» está activado** en el proyecto (Authentication → proveedor Email; el nombre exacto del panel puede variar según la versión). Sin ese ajuste, el código es una barrera de la pantalla: quien llamara directamente a la API con una sesión robada podría cambiar la contraseña sin él.

Con el ajuste activado, Supabase exige el código **cuando la sesión no es reciente** (no ha iniciado sesión hace poco). Por eso la comprobación de la contraseña actual usa un cliente aparte: si usara la sesión real, iniciar sesión «de nuevo» la haría reciente y el servidor dejaría de pedir el código.

### Pendiente de quien administra el proyecto (no se puede hacer desde el código)
1. Activar **Secure password change** en el proyecto de Supabase de producción.
2. Activar, si el panel lo ofrece, el **aviso por correo de «contraseña cambiada»** (Authentication → Emails → notificaciones), para que el titular se entere si alguien la cambia.
3. Comprobar que el correo de la plantilla de **reautenticación** («Confirm reauthentication», con `{{ .Token }}`) está pegado en Supabase, junto con las otras plantillas (`supabase/templates/README.md`), y que el SMTP envía (docs/16-EMAIL-SMTP.md). Sin correo que llegue, **nadie puede cambiar su contraseña** (sí puede recuperarla por «¿Olvidaste tu contraseña?», que tiene el mismo requisito).
4. (Plan Pro) Activar la protección de contraseñas filtradas (ya anotado en docs/15).

## Qué no se ha podido probar
- El envío real del código y su aplicación: necesitan un buzón. Está probado: validaciones, medidor, el primer paso contra el servidor (contraseña incorrecta no envía nada) y la accesibilidad de los formularios. El paso 2 completo hay que probarlo a mano con una cuenta de prueba cuando el SMTP funcione.

## Si se quisiera ir más lejos
Un código propio verificado en nuestro servidor (tabla de códigos con caducidad y límite de intentos, y cambio de contraseña con la API de administración) haría el código obligatorio sin depender del ajuste de Supabase y de la antigüedad de la sesión. Es más trabajo y más superficie que mantener; solo compensa si ese ajuste no se puede activar.
