# Fase 3 — QA funcional

> Fecha: 2026-11-03 · Entorno: **Supabase local + build de producción de la app** (`localhost:3300`), datos ficticios ([DEMO_DATA_PLAN.md](../demo/DEMO_DATA_PLAN.md)).
> Método: dos sesiones de Chrome a la vez (marca y creador) manejadas con Playwright. Se registran todos los errores de consola y las respuestas HTTP ≥ 400, y se captura cada paso.
> El flujo se ha ejecutado en **un ensayo por tramos y cuatro tomas de grabación**: tres completas y la primera hasta el paso 20. Cada una partió de una base recién sembrada.

## 1. Resultado por flujo

| # | Flujo | Resultado | Notas |
|---|---|---|---|
| 1 | Inicio de sesión (creador y partner) | ✅ | Redirige a `/creator` o `/partner` según el rol |
| 2 | Recorrido de bienvenida | ✅ | 5 pasos con «Saltar»; se recuerda por usuario en `localStorage` |
| 3 | Panel «Hoy» del creador | ✅ | Indicadores, «Necesita tu atención», redes y marcas sugeridas |
| 4 | Métricas | ✅ | Totales, peso por red, conexiones; las redes no soportadas salen como «Próximamente» |
| 5 | Descubrir (partner): destacados, filtros por categoría, guardados | ✅ | Filtro «Moda» + «Buscar» |
| 6 | Perfil público del creador | ✅ | Redes, datos clave, reputación (4,7 · 3) y catálogo con «Hacer oferta» |
| 7 | Chat: iniciar conversación y enviar mensajes | ✅ | |
| 8 | Oferta sobre un paquete (elegir paquete, precio distinto al de catálogo, mensaje) | ✅ | `create_offer` |
| 9 | Rechazar una oferta (con confirmación) | ✅ | `respond_offer(false)` |
| 10 | Aceptar una oferta → colaboración creada sola | ✅ | Aparece en «En curso» con el precio acordado (1.050 €) |
| 11 | CIBERAN Studio: tablero por fases, nueva publicación vinculada a la colaboración | ✅ | Título, texto, colaboración, formato, red, fecha y hashtags |
| 12 | Predicción de éxito | ✅ con observación | Sin IA calcula una heurística y lo dice; consume 1 crédito (F-06) |
| 13 | Subir foto, avanzar fases, enviar a revisión | ✅ | |
| 14 | Marca: «Por revisar» → pedir cambios (comentario obligatorio) | ✅ | `request_post_changes` |
| 15 | Creador: aviso en la bandeja → banner e historial de revisión → corregir y reenviar | ✅ | |
| 16 | Marca: aprobar con comentario → «Programada» en su calendario | ✅ | `approve_post` |
| 17 | Marcar como publicada | ✅ tras arreglo | Antes avisaba de que se saltaba una revisión ya hecha (F-07) |
| 18 | Completar la colaboración (con confirmación) | ✅ | `mark_collaboration_completed` |
| 19 | Valoraciones mutuas (estrellas y comentario) | ✅ tras arreglo | Antes fallaba la carga de «tus valoraciones» (F-01) |
| 20 | Bandeja de entrada: avisos agrupados (×2) | ✅ | |
| 21 | Privacidad del chat | ✅ tras arreglo | Antes no se guardaba nunca (F-01) |
| 22 | Guardar ficha, portada, avatar y avisos leídos | ✅ | Regresión de los permisos por columna (`20261103170000`) |

**Sin probar en navegador (limitaciones):**

| Flujo | Motivo | Cobertura alternativa |
|---|---|---|
| Alta desde `/onboarding` | Pendiente (el entorno de demo crea las cuentas con la Admin API) | El trigger de alta está verificado con `signup-trigger.spec.ts` y con la siembra |
| Suscripción Pro y pago de colaboración (Stripe) | Requiere Stripe Test Mode con el webhook reenviado (Stripe CLI) | Tests unitarios del webhook e índice de idempotencia; plan S1-S9 en `07_CRITICAL_FINDINGS_VALIDATION.md` |
| Conectar Instagram/YouTube (OAuth) y estadísticas de YouTube | Requiere apps reales de Meta y Google | Tests unitarios de OAuth, cifrado y sincronización |
| Panel de administración | Fuera del escenario de la demo | Revisión de código (sesión y límites) |
| Búsqueda con IA | Requiere clave de OpenRouter (servicio externo) | — |

## 2. Defectos encontrados

### F-01 · `useSupabaseUser().value.id` es `undefined` — Alta · **Corregido**
- **Reproducción:**
  1. Elegir «Solo tras oferta aceptada» en el perfil y recargar: vuelve a «Cualquiera».
  2. Abrir una colaboración completada y ya valorada: vuelve a pedir valoración. La consola muestra `400 … rater_profile_id=eq.undefined`.
- **Causa:** con @nuxtjs/supabase 2, `useSupabaseUser()` devuelve los *claims* del JWT (`sub`, no `id`).
- **Arreglo:** `.sub` en `useRatings`, `useChatSettings`, `useMyAvatar` y `useMyProfileId`. Ver T-05.
- **Prueba:** en el navegador ya no hay 400, la valoración aparece como hecha y la base guarda `chat_privacy='accepted_offers_only'`.

### F-07 · Aviso falso de «saltarte la revisión» después de aprobar — Media · **Corregido**
- **Reproducción:**
  1. La marca aprueba la publicación (queda «Programada»).
  2. El creador pulsa «Mover a "Publicado"».
  3. Sale «Vas a saltarte la revisión del partner… ¿Moverla igualmente sin su aprobación?», aunque ya está aprobada. Si se cancela, la publicación no se publica.

  Encontrado al revisar la segunda toma de la grabación.
- **Causa:** `movingSkipsPartnerReview` solo miraba la fase de destino.
- **Arreglo:** recibe también la fase de origen y no avisa desde «Programado» ni «Publicado». Actualizados `usePostActions.ts` (tablero y lista) y `creator/post/[id].vue`, con 4 tests nuevos en `tests/unit/partner-review-skip.spec.ts`.
- **Prueba:** en la tercera toma, «Mover a "Publicado"» funciona sin diálogo y el guion comprueba que la publicación queda publicada.

### F-02 · Aviso de «nueva solicitud» al aceptar una oferta — Media · **Pendiente**
- **Reproducción:** NOVA oferta en el chat y AREZZ acepta. La bandeja de AREZZ muestra «Nueva solicitud de colaboración — NOVA STUDIO quiere colaborar contigo».
- **Causa:** el trigger `notify_collaboration_created` no distingue las colaboraciones que nacen de `respond_offer`.
- **Propuesta:** migración que salte el aviso, o cambie el texto, cuando `new.offer_id is not null`.

### F-03 · La predicción no aparece en la ficha justo después de crear la publicación — Baja · **Corregido**
- **Reproducción:** «Nueva publicación» → «Predecir éxito» → «Abrir publicación». La ficha dice «Todavía no has predicho el éxito» y ofrece volver a predecir (otro crédito). Al recargar aparece el 76. Se veía en la tercera toma del vídeo.
- **Causa:** `PostComposerSheet` guardaba el resultado solo en su propio estado, no en la publicación compartida de `useMyPosts`, que es la que lee la ficha.
- **Arreglo:** el compositor actualiza `successScore`, `aiEvaluated` y `suggestions` de esa publicación, igual que ya hacía `usePostEditorPanel`.
- **Prueba:** en la cuarta toma, la ficha muestra la puntuación sin recargar.

### F-04 · Avisos de hidratación — Baja · **Pendiente**
«Hydration completed but contains mismatches» en `/partner`, `/partner/requests` y `/creator/profile`. Probablemente fechas relativas («hace 2 d») o datos que solo existen en el cliente. No se ve nada roto, pero puede dar parpadeos.

### F-05 · Se puede completar una colaboración sin pagarla — Media · **Decisión de producto**
Tras aceptar, la marca recibe «Colaboración lista para pagar», pero `mark_collaboration_completed` admite `accepted`, sin pago. Si el pago debe ser obligatorio antes de cerrar, hay que exigir `paid_at` (o `in_progress`) en la función.

### F-06 · La predicción heurística consume créditos — Media · **Decisión de producto**
Sin IA disponible, la predicción es una heurística («solo por la forma del borrador») y aun así descuenta 1 de los 3 créditos de bienvenida. Conviene no cobrarla o avisar antes de pulsar.

## 3. Evidencia

Las capturas de cada paso están en la carpeta de trabajo de la grabación. Las de apoyo, una por escena, están en `docs/demo/video/capturas/` (ver [FINAL_DEMO_REPORT.md](../demo/FINAL_DEMO_REPORT.md)).
