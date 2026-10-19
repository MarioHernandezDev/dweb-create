# 4. Roadmap y Checklist de Tareas (Semanas 1-6)

## 4.1 Convenciones

- Equipo de **2 desarrolladores**: se asignan como **Dev A** y **Dev B** (reemplazar por nombres reales del equipo).
- Sugerencia de reparto: **Dev A** se enfoca más en Backend/Supabase/ML, **Dev B** más en Frontend/Nuxt/UI, pero ambos deben poder tocar todo el stack (pair-programming recomendado en puntos críticos marcados con 🔗).
- Cada semana cierra con una **Demo interna** (viernes) y una breve retro de 15 min.
- Checklist usable directamente en GitHub Issues/Projects: cada ítem puede convertirse en un issue.

---

## Semana 1 — Fundaciones y Setup del Proyecto

**Objetivo de la semana**: tener el proyecto Nuxt 3 corriendo, Supabase conectado, autenticación básica funcionando y el esquema de base de datos inicial migrado.

### Dev A (Backend / Supabase)
- [ ] Crear proyecto en Supabase (entorno `dev`).
- [ ] Configurar CLI de Supabase (`supabase init`, `supabase link`) y carpeta `supabase/migrations/`.
- [ ] Migrar el esquema inicial de [`2-DATABASE-SCHEMA.md`](./2-DATABASE-SCHEMA.md): `organizations`, `profiles`, `clients`.
- [ ] Implementar funciones auxiliares `current_org_id()` e `is_org_admin()`.
- [ ] Habilitar y probar policies RLS de `organizations`, `profiles`, `clients` con usuarios de prueba.
- [ ] Documentar variables de entorno necesarias en `.env.example`.

### Dev B (Frontend / Nuxt)
- [ ] Inicializar proyecto Nuxt 3 (`npx nuxi init`) con TypeScript estricto.
- [ ] Instalar y configurar TailwindCSS + sistema de diseño base (tipografía, colores, espaciados).
- [ ] Instalar módulo `@nuxtjs/supabase` y configurar variables públicas/privadas.
- [ ] Crear layout base (`default.vue`) con sidebar de navegación y header.
- [ ] Configurar ESLint + Prettier + Husky (pre-commit) para mantener consistencia de código.

### 🔗 Conjunto (ambos)
- [ ] Definir estructura de carpetas según [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) sección 1.7.
- [ ] Configurar repositorio: ramas (`main`, `develop`), convención de commits (Conventional Commits), plantilla de PR.
- [ ] Configurar despliegue en Vercel/Netlify con preview deployments por PR.
- [ ] Reunión de 30 min: validar que ambos pueden correr el proyecto localmente end-to-end.

**Entregable de la semana**: App Nuxt desplegada en preview, login/registro funcional contra Supabase Auth, migraciones base aplicadas.

---

## Semana 2 — Autenticación, Multi-tenancy y Gestión de Clientes

**Objetivo de la semana**: flujo de login/registro completo con creación de organización, y CRUD de clientes funcionando en UI.

### Dev A (Backend / Supabase)
- [ ] Implementar trigger/función que, al registrarse un usuario, cree su `organization` y su `profile` con rol `owner` automáticamente.
- [ ] Migrar tablas `social_accounts` (sin integración real todavía, solo estructura).
- [ ] Implementar Server Routes: `GET/POST/PATCH/DELETE /api/clients`.
- [ ] Escribir tests de las policies RLS (usando `supabase test db` o scripts con distintos JWT simulados).

### Dev B (Frontend / Nuxt)
- [ ] Páginas: `/login`, `/register`, `/onboarding` (crear organización/nombre de agencia).
- [ ] Middleware `auth.global.ts` para proteger rutas del dashboard.
- [ ] Vista `/clients` (listado) y `/clients/[id]` (detalle) con formulario de alta/edición.
- [ ] Componente `ClientCard.vue` y `ClientForm.vue` reutilizables.
- [ ] Store de Pinia `useClientsStore` conectado a los endpoints de Dev A.

### 🔗 Conjunto
- [ ] Definir los roles de la aplicación (`owner`, `admin`, `editor`, `client_viewer`) y qué puede hacer cada uno en la UI (ocultar/deshabilitar acciones).
- [ ] QA cruzado: Dev A prueba la UI de Dev B y viceversa; reportar bugs como issues.

**Entregable de la semana**: un usuario puede registrarse, crear su agencia, y gestionar una lista de clientes (CRUD completo) con los permisos correctos.

---

## Semana 3 — Línea de Tiempo de Entregas (Timeline) y Gestión de Posts

**Objetivo de la semana**: módulo central del producto — la línea de tiempo de contenido por cliente.

### Dev A (Backend / Supabase)
- [ ] Migrar tabla `posts` completa con todos los estados (`idea` → `published`).
- [ ] Server Routes: `GET /api/clients/[id]/posts`, `POST /api/posts`, `PATCH /api/posts/[id]` (incluye cambio de estado).
- [ ] Policies RLS de `posts` (ver sección 2.4).
- [ ] Endpoint agregador: `GET /api/clients/[id]/timeline-summary` (cuántos posts pendientes esta semana, por estado).
- [ ] Configurar Supabase Storage para subida de media (`media_url`), con policies de acceso por organización.

### Dev B (Frontend / Nuxt)
- [ ] Componente `Timeline.vue`: vista de calendario/lista agrupada por semana con drag handle para reordenar fechas (opcional stretch).
- [ ] Componente `PostCard.vue` con badge de estado y fecha límite (`due_date`) con alerta visual si está próxima a vencer (<48h).
- [ ] Modal/página de creación de post (`PostForm.vue`): título, tipo de contenido, caption, hashtags, fecha, red social destino.
- [ ] Subida de archivos (preview de imagen/video) integrada con Supabase Storage.
- [ ] Filtros por estado y por cliente en la vista `/timeline`.

### 🔗 Conjunto
- [ ] Definir la máquina de estados de `posts` (qué transiciones son válidas, p. ej. no se puede pasar de `idea` directo a `published`).
- [ ] Probar el flujo completo: crear cliente → crear post → cambiar estados → ver reflejado en timeline.

**Entregable de la semana**: timeline funcional y utilizable en producción para gestionar entregas reales de un cliente piloto.

---

## Semana 4 — Métricas de Redes Sociales (Consolidación)

**Objetivo de la semana**: ingesta y visualización de métricas reales o simuladas por cliente/post.

### Dev A (Backend / Supabase / Integraciones)
- [ ] Investigar y documentar límites/requisitos de Instagram Graph API, TikTok API y YouTube Data API (OAuth scopes, rate limits).
- [ ] Implementar flujo OAuth de conexión de cuentas sociales (`social_accounts`), con cifrado de tokens.
- [ ] Job/Server Route de sincronización de métricas (`POST /api/sync/metrics`, invocable manualmente primero, cron después).
- [ ] Migrar y poblar tabla `metrics`; crear vista `v_weekly_deliverables` y vistas agregadas de engagement.
- [ ] Si no hay acceso aprobado a alguna API externa todavía: crear un modo "mock data" con datos simulados realistas para no bloquear a Frontend.

### Dev B (Frontend / Nuxt)
- [ ] Vista `/metrics` con dashboard general (gráficos de views/likes/engagement por cliente, por rango de fechas).
- [ ] Vista de detalle de métricas por post individual.
- [ ] Integrar librería de gráficos (p. ej. Chart.js o ApexCharts) con theming consistente a TailwindCSS.
- [ ] Estado de carga/error robusto para cuando una cuenta social no está conectada o falla la sincronización.

### 🔗 Conjunto
- [ ] Decisión de producto: ¿qué plataformas se soportan en el MVP (prioridad sugerida: Instagram → TikTok → YouTube)?
- [ ] Validar con datos reales (o mock) que los números mostrados tienen sentido de negocio.

**Entregable de la semana**: al menos una red social conectada end-to-end (o modo mock), con dashboard de métricas visible y coherente.

---

## Semana 5 — Motor de Machine Learning (MVP) y Monetización con Stripe

**Objetivo de la semana**: primera versión del predictor de éxito + flujo de pago funcional.

### Dev A (ML / Backend)
- [ ] Levantar `ml-service` (FastAPI) básico con endpoint `/predict` (modelo heurístico inicial, ver [`3-ML-PIPELINE.md`](./3-ML-PIPELINE.md) sección 3.5).
- [ ] Implementar feature engineering básico desde `posts` + `metrics` históricas.
- [ ] Implementar Server Route `POST /api/ml/predict` (gateway) con persistencia en `ml_predictions` y descuento de crédito.
- [ ] Implementar `GET /api/ml/trends` con datos iniciales sembrados manualmente en `trends` (o scraping simple/API de terceros).

### Dev B (Frontend + Stripe)
- [ ] Configurar cuenta de Stripe (modo test), productos y precios (planes: Free, Starter, Pro, Agency).
- [ ] Implementar `POST /api/stripe/create-checkout-session` y página `/billing`.
- [ ] Implementar `POST /api/stripe/webhook` con verificación de firma y manejo de eventos (ver [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md) sección 1.5).
- [ ] UI de estado de suscripción y créditos disponibles (badge visible en header/dashboard).
- [ ] Widget de predicción de éxito integrado en `PostForm.vue` ("Predecir éxito" con loading state y resultado).

### 🔗 Conjunto
- [ ] Probar el ciclo completo: usuario free consume créditos gratis → se queda sin créditos → se le invita a upgrade → paga en Stripe → webhook activa plan → créditos se recargan.
- [ ] Definir número de créditos gratis/mes por plan (documentar en `subscriptions`/`credit_ledger`).

**Entregable de la semana**: un usuario puede suscribirse vía Stripe y usar el predictor de ML con control de créditos funcionando de punta a punta.

---

## Semana 6 — Pulido, PWA, QA y Lanzamiento Beta

**Objetivo de la semana**: dejar el producto listo para un grupo cerrado de beta testers.

### Dev A (Backend / QA / Infraestructura)
- [ ] Revisión completa de policies RLS en todas las tablas (auditoría de seguridad manual, checklist de sección 2.4).
- [ ] Configurar monitoreo/alertas (Sentry backend, logs de Supabase, alertas de fallos en webhooks de Stripe).
- [ ] Pruebas de carga básicas en endpoints críticos (`/api/ml/predict`, `/api/clients/[id]/posts`).
- [ ] Preparar script de seed de datos de demo (`supabase/seed.sql`) para onboarding de beta testers.

### Dev B (Frontend / PWA / UX)
- [ ] Configurar `@vite-pwa/nuxt`: manifest, íconos, service worker con estrategia de caché para assets estáticos.
- [ ] Auditoría de responsive/mobile en todas las vistas principales (timeline, métricas, billing).
- [ ] Pulido de estados vacíos (empty states), errores y loaders en toda la app.
- [ ] Onboarding guiado (tour rápido) para nuevos usuarios tras el registro.

### 🔗 Conjunto
- [ ] Testing end-to-end manual del flujo completo (registro → cliente → post → métrica → predicción ML → pago).
- [ ] Redactar lista de beta testers y plan de invitación (feature flag o lista blanca de emails).
- [ ] Retro general de las 6 semanas: qué se aprendió, qué se pospone al roadmap post-MVP (Capacitor, más plataformas sociales, modelo ML avanzado con XGBoost, portal de cliente, etc.).
- [ ] Lanzamiento beta cerrada 🚀.

**Entregable de la semana**: Beta cerrada lanzada, PWA instalable, sistema monitoreado y con un primer grupo real de usuarios probando el producto.

---

## 4.2 Backlog Post-MVP (no asignado a semanas, para referencia futura)

- [ ] Modelo de ML avanzado (Gradient Boosting) entrenado con datos propios acumulados.
- [ ] Portal de solo lectura para el cliente final (`client_viewer`) con link compartible por proyecto.
- [ ] Empaquetado con Capacitor para distribución en App Store / Google Play.
- [ ] Soporte multi-idioma (i18n) si se apunta a mercado internacional.
- [ ] Integración con más plataformas (LinkedIn, Facebook, X/Twitter, Pinterest).
- [ ] Reportes exportables en PDF para clientes de agencias.
- [ ] Notificaciones push nativas (FCM/APNs) y recordatorios automáticos de entregas próximas a vencer.
- [ ] Sistema de roles más granular (permisos por cliente, no solo por organización).

## 4.3 Próximos pasos relacionados

- Arquitectura técnica completa: [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md)
- Esquema de base de datos: [`2-DATABASE-SCHEMA.md`](./2-DATABASE-SCHEMA.md)
- Detalle del pipeline de ML: [`3-ML-PIPELINE.md`](./3-ML-PIPELINE.md)
