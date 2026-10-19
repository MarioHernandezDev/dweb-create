# dweb-create

**La plataforma todo-en-uno para creadores de contenido y Community Managers.**

Administra las entregas de contenido de tus clientes en una línea de tiempo clara, consolida las métricas de todas tus redes sociales en un solo lugar, y usa Machine Learning para predecir el éxito de tus publicaciones antes de subirlas y descubrir tendencias antes que tu competencia.

## ✨ ¿Qué resuelve?

- 📅 **Línea de tiempo de entregas**: visualiza cuántos vídeos/posts quedan por subir esta semana, por cliente.
- 📊 **Métricas consolidadas**: vistas, likes, comentarios y engagement de Instagram, TikTok y YouTube en un solo dashboard.
- 🤖 **Predicción con ML**: un score de éxito (0-100) y sugerencias de copy, hashtags y horarios antes de publicar.
- 📈 **Motor de tendencias**: ideas de contenido basadas en lo que está funcionando ahora mismo en tu nicho.
- 💳 **Monetización por suscripción**: planes gestionados con Stripe, con modelo de créditos para el consumo de ML.

## 🧱 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | [Vue 3](https://vuejs.org/) + [Nuxt 3](https://nuxt.com/) + [TailwindCSS](https://tailwindcss.com/) |
| Backend / DB / Auth | [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS, Storage, pgvector) |
| Pagos / Suscripciones | [Stripe](https://stripe.com/) (Checkout + Webhooks) |
| Machine Learning | Server Routes de Nuxt + servicio de inferencia (Python/FastAPI) + LLM vía API |
| Móvil | Progressive Web App (PWA) — ruta futura a [Capacitor](https://capacitorjs.com/) |

## 📚 Documentación

Toda la arquitectura, el modelo de datos, el pipeline de ML y el plan de trabajo viven en [`docs/`](./docs):

1. [**Arquitectura**](./docs/1-ARCHITECTURE.md) — visión general del sistema, diagramas de autenticación, flujo de pagos con Stripe y flujo de inferencia de ML.
2. [**Esquema de Base de Datos**](./docs/2-DATABASE-SCHEMA.md) — modelo entidad-relación, DDL completo y políticas RLS para Supabase.
3. [**Pipeline de Machine Learning**](./docs/3-ML-PIPELINE.md) — entradas, procesamiento, modelos a usar y formatos de salida (JSON) del motor de predicción y tendencias.
4. [**Roadmap y Tareas**](./docs/4-ROADMAP-AND-TASKS.md) — checklist semana a semana (Semana 1 a 6) con responsabilidades para un equipo de 2 desarrolladores.

## 🚀 Guía de Inicio Rápido

> ⚠️ El proyecto está en fase de documentación/planificación inicial. Esta guía se irá completando a medida que se vaya generando el código (Semana 1 del roadmap).

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd dweb-create

# 2. Instalar dependencias (una vez inicializado el proyecto Nuxt)
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLIC_KEY

# 4. Levantar Supabase local (opcional, o usar proyecto en la nube) y aplicar migraciones
supabase start
supabase db push

# 5. Correr el entorno de desarrollo
npm run dev
```

## 🔄 Protocolo de Trabajo

Somos un equipo de 2 desarrolladores trabajando en iteraciones cortas y acopladas al [roadmap](./docs/4-ROADMAP-AND-TASKS.md). El flujo semanal es el siguiente:

1. **Lunes — Kickoff de la semana (15-30 min)**
   Revisamos el checklist de la semana en curso en [`4-ROADMAP-AND-TASKS.md`](./docs/4-ROADMAP-AND-TASKS.md), confirmamos la asignación Dev A / Dev B, y convertimos cada ítem pendiente en un issue de GitHub si aún no existe.

2. **Durante la semana — Desarrollo en ramas cortas**
   - Cada tarea se desarrolla en una rama propia (`feature/<slug>`) a partir de `develop`.
   - Commits siguiendo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).
   - Pull Request contra `develop` tan pronto como la tarea sea funcional, aunque sea parcial — preferimos PRs pequeños y frecuentes sobre PRs enormes.

3. **Revisión cruzada (Code Review)**
   - El otro desarrollador revisa el PR en menos de 24h.
   - Puntos marcados con 🔗 en el roadmap (trabajo conjunto) se revisan en vivo (pair programming o videollamada corta) en lugar de async.
   - Antes de aprobar: verificar que las políticas RLS no quedaron abiertas de más (ver checklist de seguridad en [`2-DATABASE-SCHEMA.md`](./docs/2-DATABASE-SCHEMA.md) sección 2.4).

4. **Miércoles — Check-in rápido (15 min)**
   Sincronización corta para destrabar bloqueos, decidir si algo del checklist semanal se pospone o se reprioriza.

5. **Viernes — Demo interna + Merge a `develop`→`main`**
   - Se hace una demo corta (10-15 min) de lo construido en la semana, probando el flujo end-to-end relevante.
   - Si la demo es exitosa y no hay bugs críticos, se mergea `develop` a `main` (que despliega a producción/staging).
   - Retro de 15 min: ¿qué funcionó?, ¿qué bloqueó?, ¿algo que ajustar en el roadmap de la semana siguiente?

6. **Actualización de documentación viva**
   Cualquier decisión de arquitectura, cambio de esquema o ajuste al pipeline de ML que surja durante la semana se refleja inmediatamente en los documentos correspondientes dentro de `docs/`, para que la documentación nunca quede desactualizada respecto al código real.

---

📄 Documentación generada con el objetivo de servir como fuente única de verdad del proyecto antes de empezar a escribir código de producto.
