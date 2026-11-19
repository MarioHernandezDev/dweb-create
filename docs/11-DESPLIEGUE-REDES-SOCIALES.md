# 11. Redes sociales y métricas en producción

> Escrito el 2026-11-04. Esta guía es el orden exacto para dejar Instagram y YouTube funcionando cuando se despliegue la app. Sustituye a las secciones «Qué queda fuera» de [9](./9-INSTAGRAM-OAUTH-SETUP.md) y [10](./10-YOUTUBE-OAUTH-SETUP.md), que describen un estado anterior del código.
> **Qué está probado y qué no:** el código de conexión, cifrado de tokens, sincronización, renovación del token y métricas por publicación tiene tests unitarios. Con una cuenta real solo consta (CHANGELOG Alex-18) **una conexión de Instagram en desarrollo** que guardó su identificador. La sincronización, los insights de Instagram, el panel de YouTube y las métricas por publicación **no se han visto con datos reales** (las propias entradas del CHANGELOG lo dejan como «sin verificar»). Los endpoints de Meta para desautorizar y borrar datos están probados solo con firmas de prueba y no se han ejecutado con Meta real. Nada de lo que sigue se ha probado en un dominio de producción.

## 0. Lo que ya hace la app (no hay que construirlo)

| Pieza | Dónde | Estado |
|---|---|---|
| Conectar Instagram y YouTube (OAuth, tokens cifrados) | `server/api/auth/{instagram,youtube}/` | Hecho |
| Estado de la cuenta (`connected`, `expired`, `revoked`…) y botón «Reconectar» | `social_accounts`, `server/utils/social-account-state.ts` | Hecho |
| Renovar el token de Instagram antes de que caduque (dura ~60 días) | `server/utils/social-sync.ts` | Hecho; **solo si algo llama a `sync-all`** |
| Sincronización de todas las cuentas | `POST /api/social/sync-all` | Hecho; **nadie la llamaba** |
| Llamarla cada 6 horas | `.github/workflows/sync-social.yml` | **Nuevo, desactivado** hasta que lo actives (paso 5) |
| Desconectar revocando en Google | `POST /api/social/disconnect` | Hecho (Instagram no tiene revocación: se quita desde sus ajustes) |
| Métricas por publicación vinculada, instantáneas diarias | `server/utils/post-metrics*.ts`, tabla `metrics` | Hecho |
| «Desautorizar» y «Eliminación de datos» de Meta | `server/api/auth/instagram/{deauthorize,data-deletion,data-deletion-status}` | **Nuevo**, sin probar con Meta real |
| Comprobación de configuración antes de desplegar | `npm run check:social` | **Nuevo** |

## 1. Antes de nada: dominio y HTTPS

Meta **no acepta** `http://` ni `localhost` en producción. Necesitas el dominio público con HTTPS definitivo antes de configurar nada, porque las URL de los paneles de Meta y Google deben coincidir exactamente con las del `.env`.

Variables del servidor (valores en el panel del hosting, nunca en el repositorio):

| Variable | Valor |
|---|---|
| `APP_URL` | `https://tu-dominio` (sin barra final) |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | De la app de Meta (paso 2) |
| `INSTAGRAM_REDIRECT_URI` | `https://tu-dominio/api/auth/instagram/callback` |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | De Google Cloud (paso 3) |
| `YOUTUBE_REDIRECT_URI` | `https://tu-dominio/api/auth/youtube/callback` |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | 32 bytes en base64. **Guardarla en un gestor de secretos: si se pierde o se cambia, todas las cuentas conectadas dejan de poder leerse y hay que reconectarlas.** |
| `SYNC_CRON_SECRET` | 32 bytes aleatorios en base64 |

Generar una clave: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

**Comprobación:** con las variables cargadas, `node --env-file=.env.produccion scripts/check-social-config.mjs` (o `npm run check:social` con las variables ya en el entorno) debe terminar en «Todo correcto». También imprime las URL exactas que hay que pegar en los paneles. No hace peticiones de red ni muestra secretos.

## 2. Meta (Instagram)

Esto lo tienes que hacer tú con tu cuenta de Meta for Developers.

1. App con el producto **Instagram → API setup with Instagram login**. Las cuentas conectadas deben ser **profesionales** (Creador o Empresa).
2. **Business login settings → URI de redirección OAuth:** `https://tu-dominio/api/auth/instagram/callback`.
3. **URL de desautorización:** `https://tu-dominio/api/auth/instagram/deauthorize`.
4. **URL de solicitud de eliminación de datos:** `https://tu-dominio/api/auth/instagram/data-deletion`.
5. **Configuración básica de la app:** URL de la política de privacidad `https://tu-dominio/privacidad` y de los términos `https://tu-dominio/terminos`, icono, categoría y correo de contacto.
   - Las páginas legales son una plantilla: antes de pedir la revisión hay que rellenar los datos reales en `app/utils/legal.ts` (lo lleva Mario, ver `docs/PENDIENTE_MARIO.md`). Meta puede rechazar una política con marcadores.
6. **Modo Desarrollo → Activo (Live).** En modo Desarrollo solo pueden conectar las cuentas añadidas como **testers** de la app. Para cuentas de usuarios reales hace falta:
   - **App Review** de los permisos `instagram_business_basic` e `instagram_business_manage_insights` (acceso avanzado), con un vídeo que enseñe para qué se usan los datos.
   - **Verificación de negocio** en Meta.
   - Es un proceso de Meta con plazos que no controlamos: conviene empezarlo pronto.

**Probar los dos endpoints con Meta real** (cuando haya app): en el panel de Meta existe un botón de prueba de las URL de desautorización y eliminación. Después comprobar en `social_accounts` que la fila de la cuenta de prueba desaparece, y que `GET /api/auth/instagram/data-deletion-status?code=<el devuelto>` muestra «Solicitud completada».

> Sin verificar: Meta documenta que el `user_id` del `signed_request` es el identificador de la persona en la app. La app guarda en `external_account_id` el `id` que devuelve `/me`. Si en una prueba real no coincidieran, el endpoint respondería 200 pero **no borraría nada**: por eso hay que hacer esa comprobación con una cuenta de prueba antes de pasar a Live.

## 3. Google (YouTube)

1. Proyecto en Google Cloud con **YouTube Data API v3** y **YouTube Analytics API** habilitadas.
2. **ID de cliente de OAuth**, tipo «Aplicación web». URI de redirección autorizada: `https://tu-dominio/api/auth/youtube/callback`.
3. **Pantalla de consentimiento:**
   - **Importante:** mientras la app esté en estado **«Prueba»**, Google caduca el *refresh token* a los **7 días** y solo deja conectar a los usuarios de prueba añadidos a mano. Con eso las cuentas se desconectarían solas cada semana. Para producción hay que **publicar la app** («En producción»).
   - Los permisos que se piden (`youtube.readonly` y `yt-analytics.readonly`) son de lectura. Google puede tratarlos como sensibles y exigir **verificación de la app** (política de privacidad, dominio verificado y vídeo de uso). Confírmalo en la propia pantalla de consentimiento; mientras no esté verificada, hay un tope de usuarios y un aviso de «app no verificada».
   - Añadir el dominio en **Dominios autorizados** y la política de privacidad `https://tu-dominio/privacidad`.

## 4. Base de datos

Las migraciones de redes (columnas de estado, vínculos de publicaciones, `metrics` y snapshots) ya están aplicadas en el proyecto compartido (CHANGELOG Alex-13, Alex-30). **Producción debe usar otro proyecto de Supabase** (R-08): al crearlo hay que aplicar **todas** las migraciones de `supabase/migrations/`, y comprobar con `supabase migration list`.

## 5. Activar la sincronización cada 6 horas

El workflow `sync-social.yml` está desactivado a propósito. Para activarlo, tras desplegar y con `SYNC_CRON_SECRET` ya puesto en el servidor:

1. GitHub → **Settings → Secrets and variables → Actions**.
2. **Variables:** `SYNC_ENABLED = true` y `APP_URL = https://tu-dominio`.
3. **Secrets:** `SYNC_CRON_SECRET` con el mismo valor que el servidor.
4. **Actions → Sincronizar redes sociales → Run workflow** para probarlo a mano. Debe terminar en verde y mostrar «procesadas / correctas / fallidas / omitidas».

Comportamiento a tener en cuenta:
- Cada llamada procesa un lote de 25 cuentas; el workflow repite hasta 6 veces (el servidor admite una por minuto).
- Una cuenta con el token caducado o revocado pasa a «Reconectar» y no se reintenta; el workflow lo avisa como advertencia, no como fallo.
- GitHub puede retrasar las ejecuciones programadas unos minutos y **pausa los workflows programados de un repositorio sin actividad durante 60 días**. Si eso ocurriera, los tokens de Instagram podrían caducar sin haberse renovado. Alternativas si se prefiere: cron del hosting o `pg_cron` (decisión Q3).
- **Alerta pendiente:** no hay aviso automático si el workflow falla. Activa las notificaciones de fallo de GitHub Actions o añade una alerta en el sistema de logs.

## 6. Comprobación final en producción (con cuentas de prueba)

| # | Paso | Esperado |
|---|---|---|
| 1 | Conectar Instagram con una cuenta tester | Vuelve a `/creator/metrics?instagram=connected`; seguidores visibles |
| 2 | Conectar YouTube | Vuelve conectado; el panel muestra el canal |
| 3 | Vincular una publicación del tablero con un contenido real | Aparecen sus métricas |
| 4 | Lanzar el workflow a mano | Verde; `last_synced_at` de las cuentas se actualiza |
| 5 | Desconectar YouTube | La app deja de aparecer en los permisos de la cuenta de Google |
| 6 | Quitar la app desde los ajustes de Instagram | Meta llama a «desautorizar»; la fila desaparece |
| 7 | Pedir la eliminación de datos desde Meta | La fila desaparece y la página de estado muestra el código |
| 8 | Dejar pasar >60 días sin sincronizar (o forzar `token_expires_at` en una cuenta de prueba) | La cuenta pasa a «Reconectar» sin romper el resto |

## 7. Lo que sigue sin hacerse

- **Probar con Meta real y Google real en el dominio definitivo:** necesita las cuentas y el dominio.
- **App Review de Meta y verificación de Google:** trámites externos con plazos.
- **Límite de uso compartido** (`server/utils/rate-limit.ts` es en memoria): solo vale con una instancia (R-03).
- **Instagram: nombres exactos de las métricas** (`views`, `reach`, `saved`, `shares`) siguen la documentación de Meta; el código marca como no disponible la que Meta no devuelva en lugar de inventarla.
- **TikTok, X, Facebook y LinkedIn:** el botón «Conectar» se retiró (A-R10). La portada solo debe prometer Instagram y YouTube (R-25).
