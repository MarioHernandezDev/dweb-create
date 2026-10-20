# FEEDMA

**El marketplace + panel de gestión para creadores de contenido, sus managers y las marcas que los contratan.**

Una marca puede contactar directamente a un influencer, o a un manager que representa a varios. Sea cual sea el camino, todos ven en un mismo sitio qué hay que entregar esta semana, cómo van las métricas, y una predicción de éxito antes de publicar.

## ¿Qué resuelve?

- 🤝 **Marketplace de 3 roles**: una marca (**Cliente**) contrata a un **Influencer** directamente o a través de su **Manager**, que reparte el trabajo entre su equipo.
- 📅 **Línea de tiempo de entregas**: cuántos vídeos/posts quedan por subir esta semana, por influencer.
- 📊 **Métricas consolidadas**: vistas, likes, comentarios y engagement de Instagram, TikTok, YouTube y más, en un solo dashboard.
- 🤖 **Predicción con ML**: un score de éxito (0-100) y sugerencias de copy, hashtags y horarios antes de publicar.
- 📈 **Motor de tendencias**: ideas de contenido basadas en lo que está funcionando ahora mismo en el nicho del influencer.
- 💳 **Monetización doble**: suscripción mensual (Manager/Influencer pagan por usar el panel) + comisión del marketplace cuando una marca contrata a través de la plataforma (Stripe Connect).

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

- [x] Las 3 vistas con su navegación: Manager, Influencer y Cliente.
- [x] Página "Descubrir" del Cliente (contactar a un influencer o a un manager).
- [x] Página de detalle de un post (abrir una entrega y ver/editar su información).
- [x] Onboarding de primer uso (elegir rol, elegir si el influencer trabaja solo o busca manager).
- [x] Estados vacíos reales (tablero sin entregas, Descubrir sin influencers/agencias, tendencias sin datos).
- [ ] Revisar cada pantalla en un móvil de verdad, no solo en el navegador del ordenador.

📄 Detalle y reparto de estas tareas entre los dos: [`docs/5-FRONTEND-WORK-SPLIT.md`](./docs/5-FRONTEND-WORK-SPLIT.md).

### FASE 2 — Backend: Supabase (datos reales)
**Por qué va aquí:** sin esto no hay usuarios de verdad ni nada se guarda — todo lo de la Fase 1 es de mentira (datos inventados en `mock-data.ts`).

- [x] Escribir y **probar** el esquema completo + seguridad (RLS) — ya está en [`supabase/migrations/`](./supabase/migrations), aplicado contra una base de datos real y verificado a mano (un cliente no puede ver ni editar lo que no es suyo). Ver [`docs/2-DATABASE-SCHEMA.md`](./docs/2-DATABASE-SCHEMA.md).
- [x] Script para crear 3 cuentas de prueba ya relacionadas entre sí (`npm run db:seed-users`), probado en local.
- [x] Crear el proyecto real en [Supabase](https://supabase.com) y rellenar `.env` — pasos en [`docs/6-SUPABASE-SETUP.md`](./docs/6-SUPABASE-SETUP.md).
- [x] Aplicar las migraciones al proyecto real (`npx supabase db push`) — confirmado, el esquema ya existe ahí.
- [x] Login de verdad (`/login`, con `@nuxtjs/supabase`): cada rol solo puede entrar en su propia sección, sin sesión te manda a `/login`. Quitado el selector "Modo demo".
- [x] `SUPABASE_SERVICE_ROLE_KEY` ya está en `.env` y `npm run db:seed-users` confirmado contra el proyecto real: las 3 cuentas (`manager@feedma.test`, `influencer@feedma.test`, `client@feedma.test`, contraseña `feedma-demo-2026`) existen y se puede iniciar sesión con ellas.
- [x] Cambiar cada pantalla para que pida los datos a Supabase en vez de a `mock-data.ts`. Hecho para las 3 vistas (manager/influencer/cliente): posts, roster, colaboraciones, redes sociales, login y "Descubrir" ya leen y escriben contra Supabase de verdad.
  - Quedan de mentira, a propósito, solo las piezas que dependen de integraciones de la Fase 4 todavía sin construir: las sugerencias de IA (`suggestionsForDraft`), el panel de métricas por plataforma (`metricsByPlatform`/`engagementSeries` en `creator/metrics.vue` y `manager/metrics.vue` — no hay sincronización real de redes que las alimente) y el motor de tendencias (`creator/trends.vue`).

### FASE 3 — Pagos (Stripe)
**Por qué va aquí y no antes:** no tiene sentido montar cobros hasta que haya usuarios reales guardados (Fase 2).

- [ ] Crear cuenta de Stripe en modo de pruebas (test mode), con Connect activado desde el principio (hace falta para pagar a influencers/managers, no solo para la suscripción) — pasos en [`docs/7-STRIPE-SETUP.md`](./docs/7-STRIPE-SETUP.md).
- [ ] Suscripciones: el Manager y el Influencer pagan una cuota mensual por usar el panel.
- [ ] Stripe Connect: cuando una marca contrata a un influencer a través de la plataforma, FEEDMA se queda automáticamente con una comisión.
- [ ] Webhooks de Stripe para que el estado de pago en la app esté siempre al día.

### FASE 4 — Apagar los "mocks": funciones de verdad
**Por qué va aquí:** hasta este punto, varias cosas de la app son simulaciones (datos de mentira o botones que no hacen nada de verdad). Esta fase las sustituye una a una por la función real.

- [ ] Conectar redes sociales de verdad (Instagram, TikTok, YouTube...) usando sus APIs oficiales — hoy "Conectar" en Redes solo crea la fila en `social_accounts`, sin OAuth real detrás.
- [x] Motor de Machine Learning real para la predicción de éxito — ver [`docs/3-ML-PIPELINE.md`](./docs/3-ML-PIPELINE.md). `/api/ml/predict` calcula el score con un modelo heurístico y lo guarda de verdad en `ml_predictions`. Falta el motor de tendencias (`creator/trends.vue` sigue mock).
- [x] Sugerencias de IA (copy/hashtags/horario) junto a la predicción — `/api/ml/predict` las pide a un LLM gratuito vía OpenRouter cuando hay `OPENROUTER_API_KEY` configurada (ver [`docs/8-AI-SUGGESTIONS-SETUP.md`](./docs/8-AI-SUGGESTIONS-SETUP.md)); si no, cae en el texto fijo de siempre sin romper nada.

### FASE 5 — Salir a buscar usuarios reales
**Por qué va al final:** no tiene sentido invitar a nadie hasta que el pago y los datos reales funcionen sin errores.

- [ ] Lista de 5-10 influencers o managers conocidos para probar la app primero (beta cerrada).
- [ ] Contactar marcas pequeñas para el lado "Cliente" del marketplace.
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
9. [**Changelog de sesiones**](./docs/CHANGELOG.md) — qué se hizo en cada sesión de desarrollo, por qué, y qué queda por verificar. Léelo antes de retomar el proyecto después de un tiempo sin tocarlo.

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
