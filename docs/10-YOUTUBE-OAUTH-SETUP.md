# 10. Conectar YouTube de verdad (Fase 4, OAuth real)

> **Actualización 2026-11-04:** este documento describe la puesta en marcha en desarrollo y su apartado «Qué queda fuera» está desfasado: la renovación del token, la sincronización programada, la desconexión y las métricas ya existen. Para producción (dominio, URL de Meta/Google, revisión de las apps, programador) sigue [11-DESPLIEGUE-REDES-SOCIALES.md](./11-DESPLIEGUE-REDES-SOCIALES.md).

Versión "para tontos" de esta pieza de Fase 4, igual que [`9-INSTAGRAM-OAUTH-SETUP.md`](./9-INSTAGRAM-OAUTH-SETUP.md) lo fue para Instagram.

> ## 📍 Si ya tenías YouTube conectado antes de leer esto
>
> Se añadió un permiso nuevo (`yt-analytics.readonly`) para la gráfica de evolución y la estimación de
> crecimiento del detalle por red (`/creator/metrics/youtube`). Los tokens ya concedidos NO se pueden
> ampliar a posteriori con más alcance — hace falta:
> 1. Habilitar la **"YouTube Analytics API"** en tu proyecto de Google Cloud (paso 1.3 de abajo, es una
>    API distinta de la "YouTube Data API v3" que ya tenías).
> 2. Añadir ese scope a la pantalla de consentimiento si tu proyecto lo exige (paso 1.4).
> 3. **Reconectar** la cuenta en Redes (desconectar y volver a "Conectar") para que el nuevo permiso quede
>    en el token. Sin reconectar, todo lo demás sigue funcionando igual (suscriptores, vídeos recientes…),
>    pero el bloque de evolución muestra un aviso pidiendo reconectar en vez de romperse.

## 0. Qué hace esto y qué no

"Conectar" en YouTube (dentro de Redes) hace un OAuth real contra Google: el creador autoriza con su cuenta de Google, CIBERAN guarda su token (cifrado) y lee las estadísticas reales de su canal. Esos suscriptores ya cuentan de verdad en "Resumen de hoy" y en "Tus métricas", junto con los de Instagram si también la tienes conectada. Pulsando la tarjeta de YouTube en Métricas se abre un detalle completo (`/creator/metrics/youtube`):

- Cabecera del canal (avatar, nombre, miembro desde cuándo).
- Suscriptores, vistas totales, nº de vídeos, media de vistas/vídeo.
- Evolución real día a día de los últimos 28 días (vistas y suscriptores netos ganados/perdidos), con una estimación simple de a cuántos suscriptores podrías llegar en 30 días al ritmo reciente — **no es una predicción de IA**, es una media aritmética sobre tu histórico real, dicho así en la propia pantalla.
- Tus últimos 8 vídeos subidos, con sus vistas/likes/comentarios/duración reales y enlace directo a verlos.

Alcance de esta versión:
- Dos scopes de solo lectura — `youtube.readonly` (identifica el canal, estadísticas públicas) y `yt-analytics.readonly` (histórico día a día). **No publica ni gestiona nada.**
- Si el canal oculta su contador de suscriptores (ajuste propio de YouTube), no se guarda un 0 falso: simplemente no se actualiza ese número.
- Botón "Actualizar" (↻) en Redes y en el propio detalle para refrescar a mano — no hay cron automático todavía, mismo criterio que Instagram.
- **Fuera de esta versión**: vincular cada publicación del tablero de CIBERAN con su vídeo real de YouTube (lo que daría estadísticas por publicación propia, no solo del canal entero).

## 1. Crear el proyecto en Google Cloud Console (esto lo tienes que hacer tú)

Igual que con Supabase, Stripe o Meta: esto no lo puede hacer Claude Code por vosotros, hace falta tu propia cuenta de Google.

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google.
2. Arriba a la izquierda, **selector de proyecto → Proyecto nuevo**. Dale un nombre (p. ej. `CIBERAN dev`) y créalo.
3. Con ese proyecto seleccionado, ve a **APIs y servicios → Biblioteca** y habilita, por separado, las dos:
   - **"YouTube Data API v3"** (canal, estadísticas, vídeos).
   - **"YouTube Analytics API"** (el histórico día a día) — es una API distinta, hay que habilitarla aparte aunque sea el mismo producto "YouTube".
4. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** (a menos que uses Google Workspace).
   - Rellena el nombre de la app (`CIBERAN`) y un email de contacto — el resto de campos son opcionales para probarlo.
   - En **Público** (audiencia), mientras la app esté en modo "Prueba", solo las cuentas de Google que añadas como **usuarios de prueba** (en esa misma pantalla) podrán conectar su canal — añade ahí tu propia cuenta (o la del creador que vayas a probar). Esto es idéntico al modo "Desarrollo" de la app de Meta en el setup de Instagram: no hace falta ninguna revisión de Google para probarlo con cuentas propias o de testers añadidos a mano.
5. Ve a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - En **URI de redireccionamiento autorizados**, añade exactamente: `http://localhost:3000/api/auth/youtube/callback`
   - Crea y copia el **Client ID** y el **Client secret** que te muestra.

## 2. Rellenar `.env`

```bash
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
```

`SOCIAL_TOKEN_ENCRYPTION_KEY` es la misma que ya tienes (o generaste) para Instagram — no hace falta una distinta por plataforma, cifra los tokens de todas las redes por igual.

Reinicia `npm run dev` para que recoja las variables nuevas.

## 3. Cómo probar que funciona

1. Entra como una cuenta de creador en CIBERAN.
2. Ve a **Redes** → pulsa "Conectar" en YouTube.
3. Te manda a accounts.google.com a autorizar — si tu cuenta de Google es la del desarrollador del proyecto, o la añadiste como "usuario de prueba" en el paso 1.4, funciona sin más. Para cuentas de terceros ajenas haría falta publicar la app (revisión de Google), que queda fuera de esta primera versión — igual que con Instagram.
4. Si la pantalla de Google te avisa de "app no verificada", es normal en modo Prueba — pulsa "Avanzado" → "Ir a CIBERAN (no seguro)" para continuar (solo pasa con apps en modo Prueba, antes de publicarlas).
5. Tras autorizar, vuelves a `/creator/socials` con "Cuenta de YouTube conectada" y la fila ya aparece con tu nombre de canal real y tus suscriptores reales.
6. Esos suscriptores ya se suman en "Resumen de hoy" (`/creator`) y en "Tus métricas" (`/creator/metrics`), junto con los de cualquier otra red conectada.
7. Si algo falla (redirect URI mal copiada, client secret incorrecto), vuelves con un mensaje de error en la misma pantalla — mira la consola del servidor para el detalle exacto (`[auth/youtube/callback] fallo al completar el OAuth`).

## 4. Qué queda fuera de esta versión

- **Vistas/likes/comentarios por publicación propia del tablero**: necesitaría que cada entrega enlazara con el vídeo real de YouTube correspondiente — no existe ese enlace todavía en el esquema. Lo que SÍ hay son las estadísticas de tus últimos vídeos subidos al canal (independientemente del tablero), en el propio detalle.
- **Evolución más allá de 28 días**: la ventana está fija en 28 días (igual que el resumen por defecto de YouTube Studio) — ampliarla es un cambio pequeño si hace falta, pero hoy no es configurable desde la UI.
- **Refrescar el token automáticamente**: el `access_token` dura 1h, pero el `refresh_token` no caduca solo (hasta que se revoque) — cada sincronización manual ya pide uno nuevo sola, no hace falta ningún cron para esto en concreto.
- **Publicar/gestionar vídeos desde la app**: misma decisión de producto que con Instagram — no se va a construir.
- **Conectar cuentas de terceros sin ser tester**: pide publicar la app en Google Cloud (verificación de Google) — trabajo para cuando haya usuarios reales, no antes.

## Próximos pasos relacionados

- Qué hace de verdad el flujo de conexión: `server/api/auth/youtube/start.get.ts` y `server/api/auth/youtube/callback.get.ts`.
- Llamadas a la API (canal, vídeos, histórico): `server/utils/youtube.ts`, usado por `server/api/social/youtube-sync.post.ts` (refresco manual de suscriptores) y `server/api/social/youtube-channel-stats.get.ts` (el detalle completo en `/creator/metrics/youtube`).
- Cómo se cifran los tokens: `server/utils/token-crypto.ts` (compartido con Instagram).
- Checklist general de fases: [`../README.md`](../README.md)
