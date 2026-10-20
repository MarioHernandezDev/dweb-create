# 9. Conectar Instagram de verdad (Fase 4, OAuth real)

Versión "para tontos" de esta pieza de Fase 4, igual que [`6-SUPABASE-SETUP.md`](./6-SUPABASE-SETUP.md), [`7-STRIPE-SETUP.md`](./7-STRIPE-SETUP.md) y [`8-AI-SUGGESTIONS-SETUP.md`](./8-AI-SUGGESTIONS-SETUP.md) lo fueron para sus piezas.

## 0. Qué hace esto y qué no

Hoy, "Conectar" en Redes solo crea una fila en `social_accounts` sin ningún token detrás — es de mentira. Esta pieza lo sustituye por un OAuth real contra Instagram: el creador autoriza de verdad, y la app guarda su token (cifrado) para poder leer sus datos más adelante.

**Solo Instagram, de momento** — TikTok y YouTube siguen sin OAuth real, es trabajo aparte. Y dentro de Instagram, solo lo mínimo:

- Se usa **"Instagram API with Instagram Login"**, la vía que habla directo con la cuenta de Instagram (no hace falta tener una Página de Facebook ni una cuenta "Business" en ese sentido — sí hace falta que la cuenta de Instagram sea **Profesional**: Creador o Empresa, no Personal. Es gratis cambiarlo desde Ajustes > Cuenta en la propia app de Instagram).
- El único permiso que se pide es `instagram_business_basic` — identifica la cuenta (usuario, tipo de cuenta) y permite refrescar el token. **No se pide** publicar, leer mensajes ni comentarios.
- **No trae el número de seguidores todavía** — ese dato necesita el permiso `instagram_business_manage_insights`, que es una capa más (y pide verificación de negocio para usarlo con cuentas que no sean la tuya). Se deja para cuando haga falta de verdad.
- Sin las variables de entorno de abajo, "Conectar" en Instagram da un error claro en la propia pantalla — no rompe el resto de la app.

## 1. Requisito previo: cuenta de Instagram profesional

En la app de Instagram (del creador que vayas a probar, puede ser tu propia cuenta de pruebas): **Ajustes y privacidad → Tipo de cuenta y herramientas → Cambiar a cuenta profesional** → elige Creador. Gratis, sin verificación de negocio para esto.

## 2. Crear la app en Meta for Developers (esto lo tienes que hacer tú)

Igual que con Supabase y Stripe: esto no lo puede hacer Claude Code por vosotros, hace falta tu propia cuenta.

1. Entra en [developers.facebook.com](https://developers.facebook.com) con tu cuenta de Facebook (si no tienes, créala — no hace falta que la uses para nada más).
2. **Mis apps → Crear app**. Dale un nombre (p. ej. `FEEDMA dev`).
3. Dentro de la app, añade el producto **Instagram**.
4. Ve a **Instagram → API setup with Instagram login → 3. Set up Instagram business login → Business login settings**.
5. Ahí mismo tienes tu **Instagram App ID** y **Instagram App Secret** — cópialos.
6. En **OAuth redirect URIs**, añade exactamente: `http://localhost:3000/api/auth/instagram/callback`
   - Si el dashboard te obliga a HTTPS y no acepta `localhost` en HTTP, usa una herramienta de túnel (p. ej. `ngrok http 3000`) y registra la URL `https://...ngrok.../api/auth/instagram/callback` en su lugar — y usa esa misma URL en `INSTAGRAM_REDIRECT_URI` del `.env` mientras pruebes así.
7. Más abajo en esa misma sección tienes un **Embed URL** / botón de prueba — puedes usarlo para probar el login sin pasar por la app todavía, si quieres validar que la app de Meta está bien configurada antes de tocar FEEDMA.

## 3. Rellenar `.env`

```bash
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
```

`SOCIAL_TOKEN_ENCRYPTION_KEY` ya tiene un valor generado para este equipo (cifra los tokens antes de guardarlos en Supabase) — no hace falta tocarlo. Si alguna vez lo cambias, las cuentas ya conectadas quedan huérfanas (no se pueden descifrar) y hay que reconectarlas.

Reinicia `npm run dev` para que recoja las variables nuevas.

## 4. Cómo probar que funciona

1. Entra como `creator@feedma.test` (o la cuenta que tenga la cuenta de Instagram profesional de pruebas vinculada en el paso 1).
2. Ve a **Redes** → pulsa "Conectar" en Instagram.
3. Te manda a instagram.com a autorizar. Si tu cuenta es la del desarrollador de la app (o la añadiste como "tester" en el dashboard), funciona sin más — para cuentas de terceros hace falta **Advanced Access** (App Review + verificación de negocio de Meta), que queda fuera de esta primera versión.
4. Tras autorizar, vuelves a `/creator/socials` con un mensaje de "Cuenta de Instagram conectada" y la fila ya aparece como conectada (con tu `@usuario` real).
5. Si algo falla (redirect URI mal copiada, app secret incorrecta, cuenta no profesional), vuelves con un mensaje de error en la misma pantalla — mira la consola del servidor para el detalle exacto (`[auth/instagram/callback] fallo al completar el OAuth`).

## 5. Qué queda fuera de esta primera versión

- **Número de seguidores**: necesita `instagram_business_manage_insights`, no pedido todavía.
- **Refrescar el token automáticamente**: el token dura 60 días y se puede refrescar (`grant_type=ig_refresh_token`) si tiene más de 24h de vida — no hay ningún cron/job que lo haga solo todavía, así que a los 60 días sin uso la cuenta se desconecta sola (hay que volver a pulsar "Conectar").
- **Leer métricas reales** (`creator/metrics.vue` sigue mock): conectar la cuenta es el primer paso, pero todavía no hay ninguna llamada que traiga vistas/likes/comentarios reales con este token.
- **TikTok y YouTube**: mismo patrón pendiente de construir, con sus propios flujos de OAuth (distintos de Instagram).
- **Advanced Access de Meta** (conectar cuentas que no sean la tuya/las de prueba): pide App Review + verificación de negocio — trabajo para cuando haya usuarios reales, no antes.

## Próximos pasos relacionados

- Qué hace de verdad el flujo: `server/api/auth/instagram/start.get.ts` y `server/api/auth/instagram/callback.get.ts`.
- Cómo se cifran los tokens: `server/utils/token-crypto.ts`.
- Checklist general de fases: [`../README.md`](../README.md)
