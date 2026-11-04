# Fase 7 — Plan de datos y entorno de la demostración

> Escenario ficticio **AREZZ (creador) × NOVA STUDIO (marca)** para el vídeo guiado de CIBERAN.
> Fecha: 2026-11-03. Estado: **preparado, sembrado y ensayado de principio a fin** en el entorno aislado.

## 1. Aislamiento: dónde vive la demo

La demo **no toca el proyecto compartido de Supabase ni Stripe**.

| Pieza | Dónde | Cómo se garantiza el aislamiento |
|---|---|---|
| Base de datos | Supabase **local** (`npx supabase@2 start`, Docker), proyecto `ciberan-demo`, `http://127.0.0.1:54321` | Las 43 migraciones de `supabase/migrations/` se aplican desde cero con `supabase db reset --local`. |
| App | Copia de `HEAD` sacada con `git archive`, compilada (`nuxt build`) y servida en `http://localhost:3300` | Su `.env` solo contiene claves del Supabase local. Comprobado: el build no contiene el identificador del proyecto compartido ni claves `sk_` de Stripe. |
| Siembra | [`scripts/seed-demo-video.mjs`](../../scripts/seed-demo-video.mjs) | **Aborta** si `SUPABASE_URL` no es `http://127.0.0.1:<puerto>` o `localhost`, y si la base ya tiene usuarios (exige partir de `db reset`). |
| Integraciones externas | — | Sin claves de Stripe, OpenRouter, Instagram ni YouTube en el `.env` de la demo. La predicción de éxito usa la heurística local, que la propia app etiqueta como «sin IA». |

### Reproducir

```bash
# 1. Supabase local (una vez) y base recién reiniciada
npx supabase@2 start          # en una carpeta con supabase/config.toml y las migraciones
npx supabase@2 db reset --local

# 2. Copia de la app con .env local (SUPABASE_URL=http://127.0.0.1:54321, SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY del `supabase status`, DEMO_PASSWORD aleatoria)
git archive HEAD | tar -x -C ../ciberan-demo && cd ../ciberan-demo && npm ci && npx nuxt build

# 3. Siembra (las imágenes PNG son ilustraciones generadas para la demo)
node --env-file=.env scripts/seed-demo-video.mjs <carpeta-con-las-imagenes>

# 4. Servir
PORT=3300 node .output/server/index.mjs
```

## 2. Personajes (todos ficticios)

Cuentas con el dominio reservado `.test` (`@demo.ciberan.test`). La contraseña es aleatoria, solo vive en el `.env` de la demo y **no aparece en el vídeo**: las sesiones se abren antes de grabar.

### Protagonistas

| | AREZZ | NOVA STUDIO |
|---|---|---|
| Rol | Creador de contenido | Partner (marca) |
| Sector / nicho | Moda urbana y lifestyle | Moda sostenible |
| Categorías | Moda · Lifestyle · Viajes | Moda · Sostenibilidad · Lifestyle |
| Bio | «Creo contenido de moda urbana, looks reales y escapadas de fin de semana…» | «Estudio de diseño que lanza colecciones cápsula de ropa urbana con tejidos reciclados…» |
| Tarifa / presupuesto | 300 € – 1.500 € | 500 € – 2.500 € |
| Busca | Marcas de moda y lifestyle con producto propio | Creadores de moda urbana para su cápsula de otoño |
| Imagen | Retrato **ilustrado** (silueta geométrica, sin rasgos) | Logotipo geométrico (estrella de cuatro puntas) |
| Portada | Ciudad abstracta al atardecer | Muestras de tejido en composición |

### Reparto de fondo (para que Descubrir y el historial no estén vacíos)

- **Creadores:** Sofía Lagos (viajes y moda), Iker Sanz (cuidado personal), Lía Montes (fitness), Dani Ortega (tecnología), Marta Vidal (gastronomía), Kenji Ruiz (gaming).
- **Marcas:** Atelier Brisa (complementos), Lúcuma Café (hostelería), Pulso Fitwear (ropa deportiva).

Todas las imágenes son **monogramas o ilustraciones generadas** para la demo. No hay caras reales, logotipos de marcas reales ni fotografías de terceros.

## 3. Qué se siembra

| Dato | Contenido | Para qué escena |
|---|---|---|
| Redes de AREZZ | Instagram `@arezz.demo` 48.200 seguidores · YouTube «AREZZ (demo)» 12.600 suscriptores | Métricas y perfil público |
| Histórico de seguidores | 45 días de crecimiento suave por red | Métricas |
| Paquetes de AREZZ | Reel de lanzamiento 450 € · **Campaña completa 1.200 €** · Carrusel de producto 300 €, con entregables | Perfil público y oferta |
| Historial de AREZZ | 3 colaboraciones completadas con sus condiciones (Atelier Brisa 800 €, Lúcuma Café 450 €, Pulso Fitwear 600 €) | Reputación |
| Valoraciones | AREZZ recibe 5, 5 y 4 estrellas (**4,7 · 3 valoraciones**); también valora a cada marca | Perfil público |
| Historial de NOVA | 1 colaboración completada con Sofía Lagos (valoración mutua de 5) · 1 solicitud abierta a Iker Sanz · Sofía en «Guardados» | Contexto de la marca |
| Tablero de AREZZ (Studio) | 6 publicaciones: 2 ideas, 1 en producción (con checklist 2/4), 1 programada, 2 publicadas vinculadas a sus colaboraciones · etiquetas «Colaboración» y «Orgánico» | CIBERAN Studio |
| Chat | Una conversación antigua AREZZ ↔ Atelier Brisa | Lista de chats |
| Avisos | Solo los de bienvenida, leídos (se borran los que generan los triggers al sembrar) | Bandeja limpia |

## 4. Qué NO se siembra: se hace en la app durante la grabación

Los 17 pasos del escenario de la auditoría se ejecutan **de verdad** en la interfaz, con las funciones reales de la base:

| # | Paso del escenario | Cómo ocurre en CIBERAN |
|---|---|---|
| 1-2 | NOVA busca y descubre a AREZZ | Descubrir → Filtros → «Moda» |
| 3-4 | Visita su perfil y consulta sus estadísticas | Perfil público: redes, datos clave, reputación, catálogo |
| 5 | Inicia una conversación | «Iniciar chat» → `get_or_create_conversation` |
| 6 | Envía una oferta | «Oferta» → paquete «Campaña completa» → 900 € → `create_offer` |
| 7-8 | AREZZ la recibe y negocian | Mensaje con su precio + «Rechazar» (`respond_offer(false)`); NOVA envía otra de 1.050 € |
| 9-10 | AREZZ acepta y se crea la colaboración | «Aceptar» → `respond_offer(true)` crea la colaboración con el precio acordado |
| 11-12 | Se gestiona en CIBERAN Studio y se crea una publicación | Tablero → «Nueva publicación» vinculada a NOVA STUDIO → foto → fases |
| 13 | Se envía a revisión | «Mover a "Para revisar"» |
| 14 | NOVA solicita cambios | «Revisar» → «Pedir cambios» con comentario → `request_post_changes` |
| 15 | AREZZ modifica el contenido | Aviso en la bandeja → nueva foto y texto → reenvío a revisión |
| 16 | NOVA aprueba | «Aprobar» con comentario → `approve_post` (queda «Programada») |
| 17 | Se completa el flujo | AREZZ la marca como publicada; NOVA completa la colaboración (`mark_collaboration_completed`) y ambos se valoran (`submit_collaboration_rating`) |

## 5. Decisiones de honestidad (qué se ha dejado fuera y por qué)

1. **TikTok no aparece como red conectada.** La app la muestra como «Próximamente · todavía no se puede conectar», así que un primer borrador que la sembraba se corrigió.
2. **Sin métricas por publicación (vistas, likes).** La propia página de Métricas avisa de que «alcance e interacciones por publicación todavía no están conectados» (falta el permiso de insights de Meta). Sembrarlas enseñaría algo que la app real no puede obtener.
3. **Las cifras se rotulan como ficticias.** En Métricas y en el perfil público, el vídeo muestra el distintivo «Cifras ficticias de demostración», porque la página dice «Datos reales de tus redes conectadas».
4. **Fuera: la página de estadísticas detalladas de YouTube.** Llama a la API real de YouTube y con datos de demo daría error.
5. **Fuera: el pago de la colaboración (Stripe).** Requiere Stripe Test Mode con el webhook reenviado a la máquina local (Stripe CLI), que no está montado. El flujo de la demo no lo necesita: `mark_collaboration_completed` admite colaboraciones aceptadas.
6. **La predicción de éxito se enseña con su aviso.** Sin clave de OpenRouter, la app calcula una heurística y lo dice («Evaluado solo por la forma del borrador — sin IA disponible ahora mismo»). El rótulo del vídeo lo repite.
7. **No hay inicio de sesión en pantalla.** Las sesiones se abren antes de grabar, así que no se ve ninguna credencial.

## 6. Hallazgos durante la preparación (detalle en `docs/audit/03_FUNCTIONAL_QA.md`)

- **Corregido:** `useSupabaseUser()` devuelve los *claims* del JWT (el id está en `sub`, no en `id`). Por eso la privacidad del chat no se guardaba nunca y «tus valoraciones» no se cargaban (HTTP 400). Arreglo en 4 composables, verificado en el navegador.
- **Corregido:** después de que la marca aprobara, pasar la publicación a «Publicado» mostraba «Vas a saltarte la revisión del partner». La regla ahora tiene en cuenta la fase de origen; con 4 tests.
- **Pendiente:** al aceptar una oferta en el chat, el creador recibe «Nueva solicitud de colaboración — NOVA STUDIO quiere colaborar contigo» por una colaboración que ya ha aceptado.
- **Corregido:** tras predecir al crear una publicación, su ficha decía «Todavía no has predicho» hasta recargar.
- **Pendiente (menor):** avisos de hidratación en consola en `/partner`, `/partner/requests` y `/creator/profile`.
- **UX:** en el calendario de la marca, «Aprobar» queda cortado y «Pedir cambios» se parte en dos líneas.
