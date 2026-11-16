# Política de cookies

> **Borrador para revisión del abogado. No publicado.** Marcas: ver [README](README.md).

Última actualización: `[FECHA al publicar]`

## 1. Qué son y qué usamos

Las cookies son pequeños archivos que el sitio guarda en tu navegador. El almacenamiento local (`localStorage`) cumple una función parecida. En CIBERAN **solo usamos almacenamiento técnico**: el necesario para que la aplicación funcione y para recordar ajustes de la interfaz que tú eliges. No usamos cookies de publicidad, de seguimiento ni de analítica.

## 2. Qué se guarda exactamente

| Nombre | Tipo | Para qué sirve | Duración | Quién la pone |
|---|---|---|---|---|
| Cookies de sesión de Supabase (empiezan por `sb-`) `[DUDA: confirmar nombres y duración exactos en el navegador]` | Cookie técnica | Mantener tu sesión iniciada y renovarla | Hasta que cierras sesión o caduca la sesión `[DUDA: duración]` | CIBERAN, con el servicio de autenticación Supabase |
| `ciberan-rail-collapsed` | Cookie de preferencia | Recordar si has plegado el menú lateral | 1 año | CIBERAN |
| `ciberan-admin-session` | Cookie técnica (`httpOnly`, `SameSite=Strict`) | Acceso al panel de administración. Solo la usa el equipo de CIBERAN; las personas usuarias no la reciben. | 8 horas | CIBERAN |
| `ciberan:launch-notice:hide:v1:<tu id>` | `localStorage` | Recordar que ya has visto el aviso de bienvenida | Hasta que borres los datos del navegador | CIBERAN |
| `ciberan:tour:v1:<tu id>` | `localStorage` | Recordar que ya hiciste el recorrido de bienvenida | Hasta que borres los datos del navegador | CIBERAN |
| `ciberan:discover-searches:v1:<tipo>` | `localStorage` (uso antiguo) | Solo si tienes búsquedas guardadas de una versión anterior: se pasan a tu cuenta y la entrada se borra | Se elimina al migrar | CIBERAN |

No se usa `sessionStorage`.

## 3. Por qué no te pedimos que aceptes cookies

La normativa (art. 22.2 LSSI y la Guía sobre el uso de las cookies de la AEPD) exige consentimiento previo para las cookies que no son estrictamente necesarias. Las exceptuadas son las que permiten la comunicación o prestan un servicio que tú has pedido expresamente (por ejemplo, mantener tu sesión). Las de arriba entran en esa categoría o son preferencias de interfaz que decides tú. Mientras no se añada analítica, publicidad ni servicios de terceros que usen cookies, no hace falta banner. Si eso cambia, te pediremos consentimiento antes de activarlas y actualizaremos esta política.

> **Nota para el abogado (no publicar):** `[DUDA: ¿se considera técnica y exenta la cookie de preferencia ciberan-rail-collapsed (menú plegado, 1 año)? Si no, alternativa: guardarla en localStorage y reducir la duración, o pedir consentimiento.]`

## 4. Servicios de terceros

- **Imágenes:** las imágenes de la página de inicio se sirven desde nuestro propio dominio, de modo que ningún tercero recibe tu dirección IP por cargarlas. `[DEPENDE DE CAMBIO 3]` (hoy se piden directamente a Unsplash; no publicar esta frase hasta resolverlo).
- **Tipografías:** se incorporan al compilar la aplicación y se sirven desde nuestro dominio. `[DUDA: verificar en un build real que no se pide nada a fonts.googleapis.com]`
- **Monitorización de errores:** no se utiliza en el navegador. Si se activara, se haría sin datos personales y se actualizaría esta política.
- **Cuentas de Google:** el acceso con Google no está disponible. Si se activara, Google podría guardar cookies propias durante el inicio de sesión; lo indicaríamos antes.

## 5. Cómo borrar o bloquear el almacenamiento

Puedes borrar cookies y datos del sitio desde la configuración de tu navegador. Si lo haces, tendrás que iniciar sesión de nuevo y volverás a ver el aviso y el recorrido de bienvenida. Bloquear las cookies de sesión impide usar la aplicación.

## 6. Cambios

Si añadimos algún almacenamiento nuevo o cambiamos su finalidad, actualizaremos esta página y su fecha.
