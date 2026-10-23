# FEEDMA — resumen técnico del proyecto

> Documento generado para dar contexto a otra IA (o a un nuevo colaborador) que vaya a
> proponer mejoras sobre este proyecto. No contiene credenciales, claves, URLs de
> infraestructura real, ni datos personales de usuarios — solo arquitectura y estado.

## 1. Qué es

FEEDMA es un marketplace de dos lados que conecta **creadores de contenido**
(influencers que publican en redes sociales) con **partners** (marcas/empresas que
quieren colaborar con ellos). Dentro de cada rol también resuelve la gestión diaria:
un creador usa FEEDMA como su "parte de rodaje" (tablero de publicaciones, métricas de
sus redes, predicción de éxito de un borrador antes de publicar); un partner lo usa
para encontrar creadores, negociar y pagarles.

## 2. Stack técnico

- **Framework**: Nuxt 4 (Vue 3, `<script setup>` en todas partes, auto-imports de
  composables/componentes). Convención `app/` de Nuxt 4 (no la raíz clásica de Nuxt 3).
- **Estilos**: Tailwind CSS v4 (vía `@tailwindcss/vite`, sin archivo de config
  tradicional — tokens definidos en `@theme`/`:root` dentro de `app/assets/css/main.css`).
- **Backend/datos**: Supabase (Postgres + Auth + Storage + Realtime). Sin backend propio
  más allá de las rutas de servidor de Nitro (`server/api/*`) para lo que no puede
  vivir en el cliente (Stripe, llamadas a LLM, lectura con `service_role`).
- **Pagos**: Stripe — Checkout para suscripciones (plan del creador) y para el cobro
  marketplace (partner → creador, con comisión de plataforma vía Stripe Connect).
- **IA**: un LLM gratuito servido vía OpenRouter, usado para (a) juzgar la calidad real
  de un borrador de publicación (parte de la predicción de éxito), (b) el modo "Buscar
  con IA" de Descubrir, (c) ideas de tendencias por nicho.
- **Testing**: Vitest — tests unitarios (lógica pura, sin red) y de integración
  (contra el proyecto Supabase real, autenticados como cuentas de prueba).
- **Gestión de estado**: `useState` de Nuxt (no Pinia/Vuex) — un composable por
  dominio, cada uno cachea en una clave de `useState` para no repetir peticiones
  entre páginas dentro de la misma sesión de pestaña.

## 3. Modelo de dominio

Dos roles sobre una tabla `profiles` compartida (igual que Supabase Auth): `creator` y
`partner`. Cada uno tiene su propia tabla de ficha (`creators` / `partners`) con los
campos propios de su rol (tarifa vs. presupuesto, nicho vs. industria, etc.).

Entidades principales:

| Tabla | Qué es |
|---|---|
| `posts` | Una publicación de un creador (idea → producción → revisión → programado → publicado). Puede estar ligada a una `collaboration` o ser contenido propio. |
| `collaborations` | El "contrato" entre un creador y un partner concretos: estado (`requested`/`accepted`/`in_progress`/`completed`/`declined`), presupuesto, si ya se pagó. |
| `collaboration_offers` | Historial de contraofertas de presupuesto dentro de una negociación (append-only). |
| `packages` | Catálogo de un perfil — "lo que ofrezco" (creador) o "lo que necesito" (partner). |
| `conversations` / `messages` | Chat 1 a 1 entre dos perfiles cualquiera. |
| `offers` | Una oferta de precio hecha por chat sobre un `package` real de la otra persona. |
| `ml_predictions` | Resultado de predecir el éxito de un borrador. |
| `credit_ledger` | Libro de movimientos de créditos (conceder/gastar) — el saldo es la suma, no una columna cacheada. |
| `subscriptions` | Plan de pago del creador (Stripe o regalado por admin). |
| `social_accounts` | Redes conectadas de un creador (OAuth con Instagram/YouTube). |
| `notifications` | Avisos in-app (nueva solicitud, oferta aceptada, pago recibido...). |
| `reports` | Reportes de solicitudes sospechosas (spam, presupuesto poco serio). |

## 4. Flujos principales

### 4.1 Descubrir (`/creator/discover`, `/partner/discover`)
Cada rol ve un directorio del otro rol, con filtros normales o un modo "Buscar con IA"
(lenguaje natural → el LLM puntúa y explica el porqué del match). Los resultados se
muestran en una tira "Destacados" (ventana deslizante de 1–3 según el ancho de
pantalla, con `+`/`←` para avanzar/retroceder) y una lista normal debajo, sin
duplicados entre las dos zonas.

### 4.2 Paquetes y ofertas → colaboración
Un perfil publica paquetes. Cualquiera puede hacer una oferta de precio sobre un
paquete ajeno **desde el chat** (nunca se puede inventar una oferta sobre algo que no
existe — se valida en el servidor). Si el dueño del paquete acepta **y** las dos partes
son, de verdad, un creador y un partner, se crea automáticamente una `collaboration`
cobrable con el importe negociado. Si ambos son del mismo rol, queda como un acuerdo
de chat sin camino de cobro (FEEDMA no sabe cobrar entre dos perfiles del mismo rol).

### 4.3 Solicitud directa + negociación (el otro camino a una colaboración)
Desde Descubrir, cualquiera puede contactar directo y proponer un presupuesto inicial
sin pasar por un paquete concreto. A partir de ahí se puede negociar con
contraofertas (`collaboration_offers`) hasta que una parte acepta o rechaza.

### 4.4 Pago
Solo el partner paga, solo sobre una `collaboration` ya aceptada, solo si el creador
tiene su cuenta de Stripe Connect verificada. El importe que se cobra es el que hay en
la base de datos (nunca uno que mande el cliente). FEEDMA se queda una comisión fija
sobre cada cobro. Un webhook de Stripe es la única fuente de verdad de "esto se pagó" —
nunca se marca como pagado desde el cliente.

### 4.5 Tablero / publicaciones (`/creator/timeline`)
Kanban por fases (idea → producción → revisión → programado → publicado), arrastrar
para cambiar de fase, etiquetas de color, checklist por tarjeta, límite de WIP por
columna, panel lateral de edición rápida.

### 4.6 Predicción de éxito
Mezcla una heurística estructural (longitud de título/caption, nº de hashtags — nunca
sabe si el contenido es bueno) con el juicio de un LLM sobre el contenido real, cuando
hay clave de API disponible. Consume un crédito por predicción, comprobado antes de
llamar al LLM. Si no hay IA disponible, cae a heurística sola — y la interfaz lo dice
explícitamente, nunca simula un dato que no tiene.

### 4.7 Chat
1 a 1 entre perfiles, con Realtime (Supabase Postgres Changes) + un polling de
respaldo. Cada perfil puede restringir quién le escribe en texto libre ("cualquiera" o
"solo quien ya tenga una oferta aceptada conmigo") — mandar una oferta nunca está
bloqueado por esa restricción, es precisamente el mecanismo para desbloquearla.

### 4.8 Admin (`/admin`)
Panel aparte, con su propia sesión (contraseña única del equipo, no cuentas de
Supabase) y rate-limit de intentos de login. Usuarios (bloquear/regalar Pro),
actividad reciente, analíticas (altas, colaboraciones, ingresos, qué pide la gente en
Descubrir), reportes.

## 5. Seguridad — cómo está resuelto

- **RLS (Row Level Security) en todas las tablas** — ninguna tabla es de acceso libre
  por defecto.
- **Casi ninguna escritura sensible es un `update`/`insert` directo del cliente.**
  Aceptar/rechazar una colaboración, responder una oferta, marcarla como completada,
  enviar un mensaje de chat — todo pasa por funciones Postgres `security definer` que
  validan de verdad quién eres, en qué estado está lo que intentas tocar, y si el
  importe que propones coincide con una negociación real (nunca un número inventado
  en la petición).
- **El servidor nunca se fía del cliente para el dinero**: el importe que se cobra en
  Stripe se lee siempre de la base de datos, nunca del body de la petición.
- **Webhook de Stripe verificado por firma** e idempotente (una reentrega del mismo
  evento no vuelve a procesar el pago ni duplica la notificación).
- **Panel de admin con rate-limit** de intentos de login (ventana deslizante en
  memoria — ver limitación conocida abajo) y comparación de contraseña en tiempo
  constante.
- **Credenciales de demo** (si existen en el entorno) solo se muestran en desarrollo,
  nunca en un build de producción.

## 6. Sistema de diseño

Dirección visual propia ("ficha de rodaje" — metáfora de producción audiovisual):
tipografía de marca reservada a cifras protagonistas, sombra dura apilada en vez de
difusa, textura tipo claqueta en vez de degradados genéricos, una forma distinta según
el tipo de contenido (ficha para el tablero, ticket con talón de precio para paquetes)
en vez de la misma tarjeta blanca redondeada repetida en todas partes. Tokens de color
derivados del propio logo de la marca. Accesibilidad tratada como requisito, no como
añadido: foco visible siempre, `prefers-reduced-motion` respetado, diálogos con Escape
y gestión de foco, elementos interactivos alcanzables por teclado.

## 7. Testing

- **Unitarios** (`npm test`): lógica pura sin red — cálculo de comisión de Stripe,
  heurística de predicción, ventana del rate-limit.
- **Integración** (`npm run test:integration`): contra el proyecto Supabase real,
  autenticados como cuentas de prueba — crean datos de verdad, los prueban, los
  limpian. Cubren el ciclo oferta→colaboración y los permisos de las funciones
  `security definer` más sensibles.
- Sin tests end-to-end de interfaz todavía (no había ningún framework de testing antes
  de la pasada más reciente de trabajo sobre este proyecto).

## 8. Convenciones de código a tener en cuenta

- Comentarios explican el **porqué**, nunca el qué — si algo no es obvio leyendo el
  código, probablemente haya un comentario cerca explicando una decisión o un bug que
  evitaron.
- Los composables de `app/composables/` siguen todos el mismo patrón: `useState` +
  funciones `async` + mapeo `snake_case` (fila de Supabase) → `camelCase` (tipo de la
  app).
- Las rutas de servidor (`server/api/**`) nunca confían en RLS para lo que escriben con
  `service_role` — repiten a mano las comprobaciones de permiso que harían falta.
- Las migraciones de `supabase/migrations/` están escritas para poder ejecutarse más
  de una vez sin reventar (el SQL Editor de Supabase no las envuelve en una
  transacción), con comentarios de cabecera largos explicando el porqué del cambio.

## 9. Estado actual / áreas conocidas con margen de mejora

Esto es honesto a propósito — es la parte más útil para que otra IA sugiera qué tocar:

- **Sin tests end-to-end de interfaz** (Playwright/Cypress) — la cobertura actual es
  unitaria + integración contra la base de datos, no de flujos completos por UI.
- **Rate-limit del admin en memoria de un solo proceso** — no sobreviviría a un
  despliegue con varias instancias/réplicas sin pasar a un store compartido.
- **Listado de usuarios de admin sin paginar** — aceptable mientras el equipo/base de
  usuarios sea pequeña, primer cuello de botella si crece.
- **Sin concurrencia probada bajo carga real** — la protección existe por diseño
  (transacciones atómicas de Postgres), pero no se ha forzado una carrera real con
  procesos concurrentes de verdad.
- **Dirección visual no extendida a toda la app por igual** — algunas pantallas
  (listas de administración, por ejemplo) siguen con un estilo más utilitario/genérico
  que las pantallas rediseñadas más recientemente (Tablero, Paquetes, Descubrir).
- **El flujo de conectar redes sociales** (OAuth con Instagram/YouTube) es un área que,
  por decisión explícita del propietario del proyecto, ha quedado fuera de las últimas
  rondas de revisión — no está cubierto por lo anterior.

---

*Generado a partir del estado real del código y de pruebas ejecutadas contra el
proyecto — no es una descripción aspiracional de cómo debería funcionar, sino de cómo
funciona de verdad a día de hoy.*
