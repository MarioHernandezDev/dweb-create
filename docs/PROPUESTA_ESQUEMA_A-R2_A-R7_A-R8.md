# Propuesta conjunta de esquema: A-R2 (estado de cuentas), A-R7 (vínculo publicación↔contenido externo) y A-R8 (métricas)

> **Actualización 2026-10-30:** M2 y M3 aprobadas por Alex y APLICADAS (`20261030100000_post_external_links.sql`, `20261030110000_metrics_and_account_snapshots.sql`; 33 pruebas de integración OK). M3 guarda el día en `metrics.measured_on` (date) en lugar de una expresión sobre `measured_at`.
> **Actualización 2026-10-28:** M1 aprobada por Alex; el SQL definitivo está en `supabase/migrations/20261028130000_social_accounts_status_columns.sql` (pendiente de aplicar por Alex). M2 y M3 siguen siendo propuesta.
> Estado del resto: **PROPUESTA de diseño, ninguna migración escrita ni aplicada.** Todo es aditivo (regla 1 de `TRABAJO_ALEX.md` §11). Zona protegida (esquema + RLS + Supabase compartido): requiere tu aprobación explícita sobre el SQL final y aviso previo a Mario.
> Fecha: 2026-10-28. Basada en leer el esquema inicial, las migraciones de RLS y el código de ambas ramas. **Nada comprobado contra la BD real**, salvo los recuentos de A-R10.

## 1. Cómo se relacionan las tres piezas

```
social_accounts  ──(A-R2: estado, errores, último sync, id externo)
      │ 1
      │
      ├────< post_external_links >──── 1 posts        (A-R7: qué contenido externo es cada publicación)
      │            │ 1
      │            │
      │            └────< metrics                      (A-R8: observaciones por publicación)
      └────< social_account_snapshots                  (A-R8: seguidores por día, nivel cuenta)
```

- **A-R2 no depende de nada** y es la base: el estado de la cuenta decide si se puede sincronizar y si hay que mostrar "Reconectar".
- **A-R7 depende de A-R2** (hay que saber que la cuenta está conectada y quién es en el proveedor para verificar que el contenido le pertenece).
- **Las métricas por publicación (A-R8) dependen de A-R7**: sin el id externo de cada vídeo/post no hay qué pedirle al proveedor. Las métricas **a nivel de cuenta** (seguidores) solo dependen de A-R2.

### Ajuste de orden que propongo (con motivo)
Tu orden era A-R8 → A-R7. La dependencia real obliga a partirlo:
1. **A-R8a:** tabla de snapshots de cuenta + escritor idempotente (solo cuenta). Se puede hacer sin A-R7.
2. **A-R7:** vínculo publicación↔contenido externo.
3. **A-R8b:** escritura de métricas por publicación (necesita el vínculo).

El resto del orden que confirmaste no cambia.

## 2. Hallazgos del código que condicionan el diseño

1. **Los callbacks de OAuth no guardan el id de la cuenta en el proveedor.** Instagram devuelve `user_id`/`profile.id`, YouTube el id del canal; ambos se descartan. Sin él: (a) A-R4 no puede localizar la fila cuando Meta envía una desautorización (solo envía el id de usuario de Meta), (b) no se puede impedir que **la misma cuenta de Instagram se conecte a dos creadores**, (c) no se puede verificar a quién pertenece un vídeo.
2. **`metrics` tiene `views/likes/comments/shares/saves bigint not null default 0`.** Un `0` no distingue "cero de verdad" de "el proveedor no lo da" (p. ej. Instagram no ofrece todo para todos los tipos de publicación). Guardar ceros falsos sería presentar un dato inventado.
3. **`metrics.post_id` es `NOT NULL`**: no cabe ahí la historia de seguidores de una cuenta.
4. **`posts_update_self` deja al creador modificar cualquier columna de `posts`.** Si el vínculo externo viviera en columnas de `posts`, el creador podría escribir ids ajenos o falsos. Además `posts` es de las tablas más compartidas con Mario.
5. **`metrics` y `ml_predictions` no tienen policy de escritura para el navegador (correcto)**; solo `metrics_select_scoped` (creador dueño, o partner de la colaboración del post). Eso ya cubre la lectura que necesitaría A-R15.

## 2b. Qué datos se pueden obtener realmente de cada proveedor

Contrastado con la documentación oficial de Meta (media insights) y de Google (YouTube Analytics, channel reports) el 2026-10-28. **Nada de esto se ha probado contra una cuenta real**: Instagram está bloqueado (sin app de Meta) y YouTube no se ha ejecutado en esta sesión. El pipeline obliga a confirmar nombres de métricas con una cuenta real antes de darlos por buenos.

### A nivel de cuenta (A-R8a)

| Dato | Instagram | YouTube |
|---|---|---|
| Seguidores / suscriptores | `followers_count` en `/me` (ya se lee) | `statistics.subscriberCount` (Data API v3, ya se lee). **Puede estar oculto** por el canal (`hiddenSubscriberCount`) → no se guarda un 0 falso |
| Visualizaciones totales | No como dato de cuenta en el flujo actual | `statistics.viewCount`, `videoCount` (ya se leen) |
| Histórico diario | No se pide hoy; hay que construirlo con snapshots propios | **Sí, nativo:** Analytics API `views`, `subscribersGained`, `subscribersLost` por día (`dimensions=day`, ya implementado en `youtube.ts`) |

Consecuencia: para Instagram el histórico de seguidores solo existirá **desde que empecemos a guardar snapshots**; para YouTube se puede reconstruir hacia atrás. Por eso la tabla `social_account_snapshots` es necesaria.

### A nivel de publicación (A-R8b, depende de A-R7)

| Métrica | Instagram (Instagram Login, `instagram_business_manage_insights`) | YouTube |
|---|---|---|
| Vistas | `views` (marcada "en desarrollo"); `impressions` está **obsoleta** para contenido posterior al 2-jul-2024 | `views` (Data API `videos.statistics.viewCount`, o Analytics por vídeo) |
| Alcance | `reach` (estimado); disponible en feed, reels y stories | No hay "alcance" como tal |
| Me gusta | `likes` (feed y reels; **no** en stories) | `likeCount` (puede estar oculto) / Analytics `likes` |
| Comentarios | `comments` (feed y reels) | `commentCount` / Analytics `comments` |
| Compartidos | `shares` | Analytics `shares` (no está en `videos.list`) |
| Guardados | `saved` (feed y reels) | No existe |
| Interacciones totales | `total_interactions` ("en desarrollo") | — |
| Tiempo de visionado | `ig_reels_avg_watch_time` solo en reels | Analytics `estimatedMinutesWatched` |

Condiciones que el diseño debe respetar:
- **Carruseles:** Instagram **no ofrece insights** para el contenido de un álbum.
- **Stories:** los insights solo están disponibles 24 h y con menos de 5 espectadores devuelven error `10`. En esta fase **no se promete métrica de stories**.
- **Retraso y datos ausentes:** los datos pueden tardar hasta 48 h y, si faltan, Meta devuelve un conjunto vacío, **no un 0**. Por eso `metrics` necesita `unavailable_metrics` y columnas nulables: guardar 0 sería inventar un dato.
- **Retención:** Meta conserva las métricas hasta 2 años.
- **Tipos de cuenta:** Instagram requiere cuenta profesional; no se indica mínimo de seguidores.
- **Webhook de insights:** no está soportado con Instagram Login, así que la sincronización será por consulta (polling), no por eventos.
- **YouTube:** el ámbito `yt-analytics.readonly` (ya solicitado) cubre las métricas básicas y permite filtrar por vídeo con `filters=video==ID`. La documentación consultada no indicaba latencia de los datos: **sin verificar**.

## 3. Propuesta

### M1. `social_accounts` (A-R2): columnas nuevas, todas nullable o con valor por defecto

| Columna | Tipo | Para qué |
|---|---|---|
| `status` | `text not null default 'connected'` + check en (`connected`, `expired`, `revoked`, `missing_permissions`) | Estado persistente que decide si se muestra "Reconectar" |
| `last_error_code` | `text` | **Código** corto del último fallo (nunca el mensaje crudo del proveedor ni tokens) |
| `last_error_at` | `timestamptz` | Cuándo ocurrió |
| `last_synced_at` | `timestamptz` | Último sync **correcto** |
| `last_sync_attempt_at` | `timestamptz` | Último intento (para espaciar reintentos) |
| `sync_lock_until` | `timestamptz` | Cerrojo de ejecución simultánea (ver `PROPUESTA_A-R5_SYNC_ENDPOINT.md`) |
| `external_account_id` | `text` | Id de la cuenta/canal en el proveedor |
| `is_verified` | `boolean generated always as (access_token_encrypted is not null) stored` | Lo que el navegador puede leer para saber si una cuenta es real, sin leer el token |

Índice único parcial: `unique (platform, external_account_id) where external_account_id is not null`.

**Transiciones.** Solo cambian `status`: token caducado (`expired`), revocado o `invalid_grant` (`revoked`), permisos insuficientes (`missing_permissions`). Los **fallos temporales y de red NO cambian `status`**: solo rellenan `last_error_code/at`, para no enseñar "Reconectar" por un corte pasajero. Volver a `connected` solo al reconectar o al sincronizar con éxito.

**Grants.** Con la propuesta A-R11 (lista blanca por columna), estas columnas nacen sin acceso para el navegador. Conceder lectura solo de: `status`, `last_synced_at`, `is_verified`, `last_error_code`. No conceder `sync_lock_until`, `last_sync_attempt_at`, `external_account_id` ni `token_expires_at`.

**Filas existentes.** Quedan con `status='connected'` por defecto e `is_verified=false` si no tienen token (demo): la interfaz podrá por fin distinguirlas sin leer tokens.

### M2. Tabla nueva `post_external_links` (A-R7)

| Columna | Tipo |
|---|---|
| `id` | `uuid pk default gen_random_uuid()` |
| `post_id` | `uuid not null unique references posts(id) on delete cascade` (un vínculo por publicación) |
| `social_account_id` | `uuid not null references social_accounts(id) on delete cascade` |
| `platform` | `text not null` |
| `external_id` | `text not null` (id del vídeo / media) |
| `external_url` | `text` |
| `verified_at` | `timestamptz not null` |

- `unique (social_account_id, external_id)`: el mismo vídeo no se vincula a dos publicaciones.
- Plataforma inequívoca: `unique (id, platform)` en `social_accounts` + `foreign key (social_account_id, platform)` en la tabla nueva. Así la plataforma no puede discrepar de la cuenta y no hay asociaciones "por texto".
- **RLS:** `select` con el mismo criterio que `posts_select_scoped` (creador dueño o partner de la colaboración). **Sin policies de insert/update/delete** para el navegador: solo el servidor escribe, **después de comprobar con el proveedor que el contenido pertenece a la cuenta conectada**. Un `posts.platform` distinto del de la cuenta se rechaza en el servidor.

**Alternativas descartadas**

| Opción | Por qué no |
|---|---|
| Columnas en `posts` | El creador puede escribirlas (`posts_update_self`); cerrarlas exige tocar permisos de `posts` o un trigger, en la tabla más compartida con Mario |
| `posts.metadata` (jsonb) | Sin FK ni unicidad, no se puede aplicar RLS fina; ambiguo y mutable por el creador |
| Tabla nueva (propuesta) | No toca `posts` ni su RLS; integridad por FK; escritura solo del servidor |

### M3. `metrics` (A-R8b) y `social_account_snapshots` (A-R8a)

Sobre `metrics` existente (nada la lee ni la escribe hoy, así que el riesgo es mínimo), añadir:
- `source text` (`instagram` | `youtube`), `measured_at timestamptz` (cuándo mide el proveedor; distinto de `captured_at`, que es cuándo lo guardamos), `reach bigint` nullable, `unavailable_metrics text[] not null default '{}'` (qué métricas no se pudieron obtener, para no confundir "0" con "no disponible").
- Índice único `(post_id, source, measured_at)`, con `measured_at` = día UTC: **un registro por publicación y día**. Reintentar el mismo sync hace `upsert` sobre la misma fila: idempotente y con almacenamiento acotado. Se conserva el histórico diario.
- `social_account_id` ya existe; la escritura lo rellena.

Tabla nueva `social_account_snapshots`:

| Columna | Tipo |
|---|---|
| `social_account_id` | `uuid not null references social_accounts(id) on delete cascade` |
| `observed_on` | `date not null` |
| `followers_count` | `bigint null` (nulable: un canal puede ocultar sus suscriptores; no se guarda un 0 falso) |
| `views_total` | `bigint null` (visualizaciones acumuladas; YouTube lo da, Instagram no) |
| `videos_count` | `integer null` (vídeos publicados; ídem) |
| `created_at` | `timestamptz default now()` |

`primary key (social_account_id, observed_on)` → upsert idempotente. Da el histórico de los **acumulados** de la cuenta (hoy `deltaPct` está fijo a 0). Es lo que Google no conserva con histórico y lo que necesita el dashboard A-R16 (`REQUISITO_A-R16_DASHBOARD_YOUTUBE.md`); las series por día (vistas, suscriptores ganados/perdidos) se piden en vivo a la Analytics API y no se duplican aquí. RLS: lectura solo del creador dueño; sin escritura del navegador.

**Pregunta de diseño:** ¿histórico o último valor? Propuesta: histórico diario (arriba) y "último valor" = la fila más reciente; no se duplica en otra columna.

**Errores parciales y límites del proveedor:** una métrica que falla no bloquea las demás: se escribe lo obtenido y el nombre de lo que falló va a `unavailable_metrics`; el error de la cuenta se resume en `last_error_code`.

### Roles y lectura

| Dato | Creador dueño | Partner de la colaboración | Resto |
|---|---|---|---|
| `social_accounts` (columnas permitidas) | sí | no (solo RPC pública) | no |
| `post_external_links` | sí | sí (si la publicación es de su colaboración) | no |
| `metrics` | sí (política existente) | sí (política existente) | no |
| `social_account_snapshots` | sí | no (el perfil público usa la RPC) | no |

## 4. Impacto y compatibilidad

- **Código actual:** ningún cambio de comportamiento. Todo son columnas con valor por defecto o tablas nuevas sin consumidores. Los tipos se escriben a mano (`types: false`): actualizar `useMySocialAccounts.ts` en la misma rama.
- **Mario:** no toca `posts`, `collaborations` ni `notifications`. `discover/search.post.ts` seguiría igual; mejorarlo con `is_verified` es un cambio posterior en su archivo, a coordinar.
- **RPC `get_public_social_accounts`:** sin cambios en M1–M3; añadir fecha de actualización (`last_synced_at`) es un ajuste futuro (A-R12), aparte.
- **M-L2 (borrar cuenta):** `on delete cascade` desde `social_accounts` limpia vínculos y snapshots; `metrics.social_account_id` queda en `set null` (ya es así).
- **Reversibilidad:** todo es aditivo; deshacerlo es `drop column` / `drop table` sin tocar datos existentes.

## 5. Pruebas necesarias

- Integración (BD compartida, coordinar): el navegador no puede insertar/actualizar `post_external_links`, `social_account_snapshots` ni `metrics`; un creador no lee los vínculos/métricas de otro; el partner solo ve los de su colaboración; unicidad de `(social_account_id, external_id)` y de `(platform, external_account_id)`.
- Unidad (sin BD): lógica de transición de estados; construcción del día UTC de la clave idempotente; mapeo de errores a `last_error_code` sin filtrar secretos.
- Escritor idempotente: dos ejecuciones con los mismos datos dejan el mismo número de filas.

## 6. Qué necesito de ti

- [ ] ¿Apruebas el diseño por piezas (M1, M2, M3) y el ajuste de orden A-R8a → A-R7 → A-R8b?
- [ ] ¿Aceptas guardar `external_account_id` y la restricción de unicidad por plataforma? (cambia el comportamiento: una cuenta de Instagram ya conectada a otro creador no podrá conectarse a un segundo.)
- [ ] ¿Aceptas histórico diario (un registro por día) o prefieres solo el último valor?
- [ ] Orden de aplicación: M1 primero (con A-R11), luego M2 y M3. Yo no aplico ninguna sin tu "adelante" explícito sobre el SQL final.
