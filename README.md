# CIBERAN

**El marketplace + panel de gestión para creadores de contenido y los partners que los contratan.**

Un partner contacta directamente a un creador de contenido. Ambos ven en un mismo sitio qué hay que entregar esta semana, cómo van las métricas, y una predicción de éxito antes de publicar.

## ¿Qué resuelve?

- 🤝 **Marketplace de 2 roles**: un **Partner** contrata a un **Creador de contenido** directamente.
- 📅 **Línea de tiempo de entregas**: cuántos vídeos/posts quedan por subir esta semana.
- 📊 **Métricas consolidadas**: vistas, likes, comentarios y engagement de Instagram, TikTok, YouTube y más, en un solo dashboard.
- 🤖 **Predicción con ML**: un score de éxito (0-100) y sugerencias de copy, hashtags y horarios antes de publicar.
- 📈 **Motor de tendencias**: ideas de contenido basadas en lo que está funcionando ahora mismo en el nicho del creador.
- 💳 **Monetización doble**: suscripción mensual (el creador de contenido paga por usar el panel) + comisión del marketplace cuando un partner contrata a través de la plataforma (Stripe Connect).

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | [Vue 3](https://vuejs.org/) + [Nuxt 4](https://nuxt.com/) + [TailwindCSS](https://tailwindcss.com/) |
| Backend / DB / Auth | [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS, Storage) |
| Pagos | [Stripe](https://stripe.com/) (Checkout + Stripe Connect + Webhooks) |
| Machine Learning | Server Routes de Nuxt + servicio de inferencia (Python/FastAPI) + LLM vía API |
| Móvil | Progressive Web App (PWA) — ruta futura a [Capacitor](https://capacitorjs.com/) |

---

## 🗺️ Fases del proyecto — léelo antes de tocar código

Somos 2 personas. Para no pisarnos y no perdernos, el proyecto se hace **en este orden, fase por fase**. No se empieza una fase sin haber terminado (o casi) la anterior — cada una depende de la de antes.

**Cómo marcar una fase como hecha:** cuando termines una tarea, marca su casilla `- [ ]` → `- [x]` en este mismo archivo, haz commit (`git commit -m "Hecho fase 1: página de detalle de post"`) y súbelo (`git push`). Cuando esté toda una fase en verde, avísalo en el chat del equipo antes de que nadie empiece la siguiente.

### FASE 0 — Preparación ✅ (ya está hecho)
- [x] Repositorio creado, Nuxt 4 + TailwindCSS instalado y funcionando.
- [x] Sistema de diseño: colores del logo, tipografía, iconos propios.
- [x] Documentación inicial en [`docs/`](./docs).

### FASE 1 — Frontend con datos de ejemplo (en curso)
**Por qué va primero:** antes de montar una base de datos de verdad, es mucho más fácil ver y tocar la app con datos inventados. Así se detecta qué necesita cada pantalla antes de diseñar las tablas reales.

- [x] Las 2 vistas con su navegación: Creador de contenido y Partner.
- [x] Página "Descubrir" del Partner (contactar a un creador de contenido).
- [x] Página de detalle de un post (abrir una entrega y ver/editar su información).
- [x] Onboarding de primer uso (elegir rol).
- [x] Estados vacíos reales (tablero sin entregas, Descubrir sin creadores, tendencias sin datos).
- [ ] Revisar cada pantalla en un móvil de verdad, no solo en el navegador del ordenador.

📄 Detalle y reparto de estas tareas entre los dos: [`docs/5-FRONTEND-WORK-SPLIT.md`](./docs/5-FRONTEND-WORK-SPLIT.md).

### FASE 2 — Backend: Supabase (datos reales)
**Por qué va aquí:** sin esto no hay usuarios de verdad ni nada se guarda — todo lo de la Fase 1 es de mentira (datos inventados en `mock-data.ts`).

- [x] Escribir y **probar** el esquema completo + seguridad (RLS) — ya está en [`supabase/migrations/`](./supabase/migrations), aplicado contra una base de datos real y verificado a mano (un cliente no puede ver ni editar lo que no es suyo). Ver [`docs/2-DATABASE-SCHEMA.md`](./docs/2-DATABASE-SCHEMA.md).
- [x] Script para crear 3 cuentas de prueba ya relacionadas entre sí (`npm run db:seed-users`), probado en local.
- [x] Crear el proyecto real en [Supabase](https://supabase.com) y rellenar `.env` — pasos en [`docs/6-SUPABASE-SETUP.md`](./docs/6-SUPABASE-SETUP.md).
- [x] Aplicar las migraciones al proyecto real (`npx supabase db push`) — confirmado, el esquema ya existe ahí.
- [x] Login de verdad (`/login`, con `@nuxtjs/supabase`): cada rol solo puede entrar en su propia sección, sin sesión te manda a `/login`. Quitado el selector "Modo demo".
- [ ] **Registro real** (código hecho, falta probar en vivo): `/onboarding` registra de verdad (`supabase.auth.signUp()`), y `handle_new_user()` crea también la ficha del rol (`creators`/`partners`), no solo `profiles`. El proyecto exige confirmar el email antes de dar sesión, así que hay una página `/confirm` nueva para ese paso. Falta aplicar `supabase/migrations/20261020180000_real_signup.sql` y probar el alta completa en un navegador real (registro → email de confirmación → entrar).
- [x] `SUPABASE_SERVICE_ROLE_KEY` ya está en `.env` y `npm run db:seed-users` confirmado contra el proyecto real: las cuentas de prueba (contraseña: `DEMO_PASSWORD` del .env) existen y se puede iniciar sesión con ellas.
- [x] Cambiar cada pantalla para que pida los datos a Supabase en vez de a `mock-data.ts`. Hecho para las 2 vistas (creator/partner): posts, colaboraciones, redes sociales, login y "Descubrir" ya leen y escriben contra Supabase de verdad.
  - `creator/metrics.vue` ya no usa `mock-data.ts`: muestra seguidores reales por red conectada (de `social_accounts`), con un aviso honesto de que alcance/interacciones/evolución semanal todavía no están conectados (falta la API de Insights de verdad, no solo seguidores — ver [`docs/9-INSTAGRAM-OAUTH-SETUP.md`](./docs/9-INSTAGRAM-OAUTH-SETUP.md)). TikTok/YouTube siguen sin OAuth real. El motor de tendencias quedó real pero **se aparcó** (`app/_disabled/creator/trends.vue`, fuera de `app/pages` a propósito): la IA no aportaba ideas lo bastante buenas todavía. Las sugerencias de IA del predictor de éxito sí siguen activas (ver Fase 4).
- [ ] **Circuito partner↔creador completo** (código hecho, falta probar en vivo): un partner puede "Contactar" desde Descubrir y crear una colaboración real; el creador la ve y acepta/rechaza en `/creator/requests`, puede vincular un post a ella al crearlo, y "Pagar" queda bloqueado hasta que acepte. Falta probar el flujo completo en un navegador real: partner contacta → el creador acepta → se crea un post vinculado → el partner lo aprueba → el partner paga.
- [ ] **Se eliminó el rol Manager** (código hecho, falta aplicar migración y probar en vivo): decisión de producto — un manager en la práctica sería un partner más, así que categorizarlo aparte no aportaba nada. Las relaciones se centralizan en **creator ↔ partner**; "Influencer" pasó a llamarse **Creador de contenido** y "Cliente" a **Partner**, de arriba abajo (tablas, columnas, rutas, tipos). Falta aplicar `supabase/migrations/20261021120000_remove_manager_rename_creator_partner.sql` (después de las migraciones pendientes anteriores, en orden) y probar en vivo que ambas cuentas siguen funcionando.
- [ ] **Bandeja de entrada** (código hecho, falta aplicar migración y probar en vivo): icono junto al avatar de perfil (`/inbox`) con avisos de inicio de sesión, alta de cuenta y solicitudes de colaboración — escritos por triggers en la base de datos, de un solo sentido (sin chat ni email todavía). Falta aplicar `supabase/migrations/20261021110000_notifications.sql` y comprobar en vivo que llegan los avisos.

### FASE 3 — Pagos (Stripe)
**Por qué va aquí y no antes:** no tiene sentido montar cobros hasta que haya usuarios reales guardados (Fase 2).

- [x] Crear cuenta de Stripe en modo de pruebas (test mode), con Connect activado — pasos en [`docs/7-STRIPE-SETUP.md`](./docs/7-STRIPE-SETUP.md). Claves `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` ya en `.env`.
- [ ] **Suscripciones** (código hecho, falta verificar en vivo): el creador de contenido ya puede pulsar "Mejorar a Pro" en su perfil → Stripe Checkout → `server/api/stripe/webhook.post.ts` guarda la suscripción real. Falta: aplicar `supabase/migrations/20261020090000_stripe_connect_accounts.sql` (`npx supabase db push`), rellenar `STRIPE_WEBHOOK_SECRET` (`stripe listen`, ver guía) y probar el pago completo con una tarjeta de prueba.
- [ ] **Stripe Connect, cobro de colaboraciones** (código hecho, falta verificar en vivo): un creador ya puede conectar su cuenta de Stripe desde su perfil (`server/api/stripe/connect/account-link.post.ts`), queda marcada como "verificada" vía webhook, y un partner ya puede pagar el presupuesto de una colaboración concreta desde `partner/profile.vue` (`server/api/stripe/pay-collaboration.post.ts`): Checkout de pago único con `application_fee_amount` (comisión de CIBERAN) y el resto va directo a la cuenta Connect del creador (`transfer_data.destination`). Falta probarlo en vivo con una tarjeta de prueba — mismo paso de `STRIPE_WEBHOOK_SECRET` de arriba.
- [x] Webhooks de Stripe (`server/api/stripe/webhook.post.ts`, firma verificada) — falta el mismo paso de `STRIPE_WEBHOOK_SECRET` de arriba para probarlos en vivo.

### FASE 4 — Apagar los "mocks": funciones de verdad
**Por qué va aquí:** hasta este punto, varias cosas de la app son simulaciones (datos de mentira o botones que no hacen nada de verdad). Esta fase las sustituye una a una por la función real.

- [ ] **Conectar redes sociales de verdad** — **Instagram: código hecho**, incluyendo seguidores reales (OAuth con scope `instagram_business_basic,instagram_business_manage_insights`, ver [`docs/9-INSTAGRAM-OAUTH-SETUP.md`](./docs/9-INSTAGRAM-OAUTH-SETUP.md)), **falta crear la app en Meta y probarlo en vivo** — **bloqueado de momento**: Facebook no dejó crear la cuenta necesaria para developers.facebook.com, pendiente de reintentar. Ojo: para probar con cuentas propias/de amigos NO hace falta App Review ni verificación de empresa (eso es solo para abrir la puerta a desconocidos) — basta con modo Desarrollo + añadir la cuenta como tester. TikTok y YouTube siguen sin empezar — "Conectar" en esas dos sigue creando la fila sin token, sin OAuth real detrás.
- [x] Motor de Machine Learning real para la predicción de éxito y el motor de tendencias — ver [`docs/3-ML-PIPELINE.md`](./docs/3-ML-PIPELINE.md). `/api/ml/predict` calcula el score con un modelo heurístico y lo guarda de verdad en `ml_predictions`; `/api/ml/trends` genera ideas reales (nicho + posts propios + LLM) y las guarda en `trends`. Ninguno usa fuentes externas de tendencias de verdad todavía (Google Trends, pgvector…) — eso sigue siendo trabajo futuro.
- [x] Sugerencias de IA (copy/hashtags/horario) junto a la predicción — `/api/ml/predict` las pide a un LLM gratuito vía OpenRouter cuando hay `OPENROUTER_API_KEY` configurada (ver [`docs/8-AI-SUGGESTIONS-SETUP.md`](./docs/8-AI-SUGGESTIONS-SETUP.md)); si no, cae en el texto fijo de siempre sin romper nada.
- [ ] **Consumo de créditos** (código hecho, falta aplicar la migración y probar en vivo): `/api/ml/predict` ya comprueba el saldo real en `credit_ledger` antes de predecir (402 si no quedan) y descuenta 1 al terminar. Regalo de bienvenida: 3 créditos al crear la ficha de creador. Recarga mensual: 20/mes en Pro, concedidos en cada `invoice.paid` de Stripe. Falta aplicar `supabase/migrations/20261020160000_credit_grants.sql` y confirmar en vivo que el botón de predecir se bloquea a 0 créditos y que la recarga llega al renovar.

### FASE 5 — Salir a buscar usuarios reales
**Por qué va al final:** no tiene sentido invitar a nadie hasta que el pago y los datos reales funcionen sin errores.

- [ ] Lista de 5-10 creadores de contenido conocidos para probar la app primero (beta cerrada).
- [ ] Contactar marcas pequeñas para el lado "Partner" del marketplace.
- [ ] Recoger lo que falle o confunda, y arreglarlo.
- [ ] Lanzamiento público.

---

## 📚 Documentación a fondo

Cada fase de arriba tiene su detalle técnico en [`docs/`](./docs):

1. [**Arquitectura**](./docs/1-ARCHITECTURE.md) — visión general del sistema, diagramas de autenticación, flujo de pagos con Stripe y flujo de inferencia de ML.
2. [**Esquema de Base de Datos**](./docs/2-DATABASE-SCHEMA.md) — modelo entidad-relación, DDL completo y políticas RLS para Supabase.
3. [**Pipeline de Machine Learning**](./docs/3-ML-PIPELINE.md) — entradas, procesamiento, modelos a usar y formatos de salida (JSON) del motor de predicción y tendencias.
4. [**Roadmap y Tareas**](./docs/4-ROADMAP-AND-TASKS.md) — checklist semana a semana más detallado que las fases de arriba.
5. [**Reparto de trabajo del frontend**](./docs/5-FRONTEND-WORK-SPLIT.md) — cómo dividir el frontend actual entre dos personas y flujo de git para fusionar sin conflictos.
6. [**Poner en marcha Supabase**](./docs/6-SUPABASE-SETUP.md) — guía paso a paso para crear el proyecto real, aplicar las migraciones y generar las 3 cuentas de prueba.
7. [**Poner en marcha Stripe**](./docs/7-STRIPE-SETUP.md) — guía paso a paso para crear la cuenta de pruebas con Connect activado, antes de empezar la Fase 3.
8. [**Activar las sugerencias de IA**](./docs/8-AI-SUGGESTIONS-SETUP.md) — cómo conseguir una clave gratis de OpenRouter para que `/api/ml/predict` enriquezca la puntuación con sugerencias reales.
9. [**Conectar Instagram de verdad**](./docs/9-INSTAGRAM-OAUTH-SETUP.md) — cómo crear la app en Meta for Developers para que "Conectar" en Redes sea un OAuth real, no solo una fila de mentira.
10. [**Roadmap futuro**](./docs/10-ROADMAP-FUTURO.md) — hacia dónde va el producto, qué posicionamiento se decidió, y la lista priorizada de lo que falta (pagos por hitos, RGPD, tests, packs recurrentes...). Empieza por aquí si retomas el proyecto después de un tiempo sin tocarlo.
11. [**Changelog de sesiones**](./docs/CHANGELOG.md) — qué se hizo en cada sesión de desarrollo, por qué, y qué queda por verificar.

## 🚀 Guía de Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd dweb-create

# 2. Instalar dependencias
npm install

# 3. Correr el entorno de desarrollo
npm run dev
```

> A partir de la Fase 2 habrá que añadir variables de entorno de Supabase y Stripe. Cuando esa fase esté lista, esta guía se amplía con los pasos de `.env`.

## 🔄 Cómo trabajamos (resumen simple)

1. Mira la fase en la que estamos arriba y coge una tarea que no esté marcada.
2. Crea una rama: `git checkout -b feature/lo-que-sea`.
3. Haz commits pequeños y con mensajes claros mientras trabajas.
4. Cuando lo tengas, sube la rama y abre un Pull Request — aunque seáis dos, deja rastro de qué cambiaste y por qué.
5. El otro revisa el PR antes de fusionar a `main`.
6. Marca la casilla en este README, commitea ese cambio también, y avisa en el chat.

Detalle de archivos compartidos a los que hay que tener cuidado (para no pisaros el trabajo) en [`docs/5-FRONTEND-WORK-SPLIT.md`](./docs/5-FRONTEND-WORK-SPLIT.md).
