# TRABAJO_ALEX — rama `feature/onboarding`

> Actualizado el 2026-10-28. **Ninguna tarea está implementada todavía y el reparto está pendiente de aprobación.** La fuente común de planificación es [`docs/PLAN_TRABAJO_PARALELO.md`](docs/PLAN_TRABAJO_PARALELO.md): allí está el detalle de cada tarea (complejidad, dependencias, BD, criterio de terminado), las decisiones abiertas (Q1–Q13) y la matriz completa. Este archivo es la vista de **esta rama**.
>
> Cambio respecto a la versión anterior: la rama ya no es solo "onboarding". Es la rama de **todo lo que no son redes sociales ni publicaciones**: Stripe y pagos, legal/RGPD, seguridad transversal, verificación de flujos, notificaciones y chat, descubrimiento, perfil, accesibilidad y el onboarding. Motivo: el usuario reservó todas las redes sociales a la otra rama, y el resto del trabajo pendiente no tiene relación con ellas. El nombre de la rama ya no refleja su alcance (ver decisión Q8 sobre subramas por tarea).

## 1. Objetivo general

Dejar FEEDMA listo para usuarios reales: pagos probados y con política de cobro decidida, páginas legales y borrado de datos, seguridad y límites de uso, flujos principales verificados con clics reales, notificaciones y chat coherentes, y una primera experiencia guiada para quien entra por primera vez.

## 2. Inventario de tareas asignadas (20)

| ID | Tarea | Compl. | Prio |
|---|---|---|---|
| C-D1 | Probar en modo test: suscripción Pro y pago de colaboración con Connect | M | 1 |
| C-D2 | Política de cuándo se puede pagar (hoy se permite al aceptar) — decisión Q2 + implementación | A | 1 |
| C-D3 | Portal de gestión de suscripción | M | 2 |
| C-D4 | Aviso fiscal en el cobro | B | 5 |
| C-D5 | Packs mensuales/retainers (**backlog, no empezar**, Q10) | A | 5 |
| C-L1 | Páginas públicas de privacidad y términos (**publicarlas pronto: desbloquea M-R4 de la otra rama**) | B–M | 1 |
| C-L2 | RGPD: exportar y borrar los datos de una persona | A | 1 |
| C-S1 | Rate limiting general (alta de cuentas, solicitudes, reportes) | M | 1 |
| C-S2 | Auditoría y revisión del panel de administración (nunca revisado) | M | 1 |
| C-S3 | Probar el acceso cruzado entre roles en navegador | B | 1 |
| C-U4 | Backups de Supabase (decisión operativa, Q12) | B | 1 |
| C-F1 | Verificar con clics reales: oferta en chat, aprobar/pedir cambios, solicitud→aceptación | M | 2 |
| C-F2 | CI/CD básico con GitHub Actions | B | 2 |
| C-N1 | Notificaciones: agrupar solicitudes duplicadas | M | 4 |
| C-N2 | Chat: entregado/leído por mensaje | M | 4 |
| C-N3 | Coherencia de estados de colaboración y decisión sobre `offer_id` | M | 4 |
| C-U1 | Descubrimiento: verificar en navegador lo construido y pulir | M | 5 |
| C-U2 | Perfil: fotos y personalización | M | 5 |
| C-U3 | Accesibilidad (lector de pantalla) y Safari/Firefox/tablet | M | 5 |
| C-O1 | Onboarding guiado (tour por rol) | M–A | 6 |

## 3. Orden recomendado

1. **Fase 0**: resolver Q1, Q3, Q7, Q8, Q9; `git merge main` en la rama.
2. **Fase 1**: **C-L1 primero** (la otra rama lo necesita), luego C-D1 (Stripe en test), C-S3 → C-F1 → C-S2 → C-F2; C-O1 puede avanzar en paralelo (diseño primero).
3. **Fase 2**: C-D2 (con lo aprendido en C-D1) · C-L2 · C-S1 · C-N1 · C-N3 · C-U1.
4. **Fase 3**: C-D3 · C-D4 · C-N2 · C-U2 · C-U3 · C-U4.

El onboarding es prio 6 por el orden pedido, pero no depende de nada: puede construirse en paralelo con la Fase 1 si prefieres, siempre que el diseño (pasos, contenido, saltar/volver a ver, persistencia) se revise antes de escribir código.

## 4. Dependencias

- C-D1 → C-D2 → C-D4, C-D5. Externo: C-D1 necesita Stripe CLI y el onboarding Connect de un creador demo.
- C-D2 y C-N3 tocan `collaborations`: hacerlos en secuencia.
- C-L1 → M-R4 (Meta exige URL pública de privacidad). Dependencia entre ramas con fecha.
- C-L2 debe borrar también `social_accounts`/tokens: coordinar con **M-R3** (revocación en el proveedor).
- C-L2 ← Q13 (qué se conserva por obligación legal: pagos/facturas).
- C-F1/C-S3 deberían hacerse **antes** que C-N1/C-N3 para partir de un estado conocido.
- C-S1: `server/utils/rate-limit.ts` es tuyo; la otra rama lo usará para endpoints de redes. Hoy es en memoria y solo vale para una instancia (Q3).
- C-O1 ← Q1 (dónde se guarda el progreso).

## 5. Archivos que puede modificar

**Propios (libertad):**
- Dinero: `server/api/stripe/**`, `server/utils/stripe*.ts`, `app/composables/useMyBilling.ts`, `docs/7-STRIPE-SETUP.md`, botón de pago de `partner/requests.vue`.
- Nuevos: `app/components/onboarding/**`, `app/composables/useOnboardingTour.ts`, páginas legales (`app/pages/privacidad.vue`, `app/pages/terminos.vue` — rutas por confirmar), `.github/workflows/**`.
- Existentes: `app/pages/admin/**` y `server/api/admin/**`, `app/pages/chat/**`, `app/components/chat/**`, `app/composables/{useChat,useChatSettings,useNotifications,useDiscover,useProfileSearch}.ts`, `app/components/collab/**`, `app/pages/{creator,partner}/discover.vue`, `app/pages/inbox.vue`, `server/api/discover/**`, `server/utils/rate-limit.ts`, landing y `app/pages/{login,onboarding,confirm}.vue` y `role-guard.global.ts` (con cuidado: afectan a cada alta).

**Aviso importante sobre `app/pages/onboarding.vue`:** es el formulario de **alta de cuenta**, no el tour. El tour empieza después del primer login. Punto de anclaje recomendado para el tour: `app/components/layout/AppShell.vue`, igual que `ConfirmDialogHost.vue` (un componente montado una vez que decide solo si mostrarse), en vez de editar `creator/index.vue`/`partner/index.vue`.

## 6. Archivos compartidos que requieren coordinación

Ver sección E del plan. Los que más te afectan:
- `app/components/layout/AppShell.vue`: **eres su único editor previsto** (punto de montaje del tour).
- `creator/index.vue` y `partner/index.vue`: evítalos; si el tour necesita anclas concretas, avisa antes (la otra rama trabaja en esos bloques).
- `creator/profile.vue` / `partner/profile.vue`: tuyos la ficha, las fotos (C-U2) y el bloque de facturación (C-D3).
- `creator/requests.vue` / `partner/requests.vue`: tuyo el detalle de colaboración y el botón de pago; la pestaña Calendario es de la otra rama.
- `app/types/index.ts`, `status.ts`, `nav.ts`, `mock-data.ts`: solo añadir al final de tu bloque.
- `nuxt.config.ts`, `.env.example`, `package.json`, `docs/CHANGELOG.md` (título con prefijo `[Compañero]`).
- `server/api/discover/search.post.ts` usa `social_accounts.followers_count`: no cambies esa consulta sin avisar a Mario.

## 7. Cambios de Supabase que podrían hacer falta

Todos requieren explicar el impacto y confirmar **antes** de escribir la migración, y deben ser aditivos:

| Tarea | Cambio previsto |
|---|---|
| C-D2 / C-D5 | estados/hitos de pago, posible RPC y cambios en el webhook de Stripe — **zona más sensible**, confirmar antes |
| C-O1 | opcional: `profiles.onboarding_completed_at` (patrón de `chat_privacy`/`avatar_url`). `profiles` la lee casi toda la app: impacto amplio. Alternativa sin esquema: `localStorage` (Q1) |
| C-L2 | RPC/endpoint de exportación y de borrado — **zona protegida**, con test de integración |
| C-N1 | posible agrupación en consulta o columna en `notifications` |
| C-N2 | derivar de `last_read_at` primero; columnas en `messages` solo si no basta (Q9) |
| C-N3 | cambio de FK `offer_id` (`set null`→`cascade`) solo si se decide (Q7) |
| C-F1/C-S3 | ninguno (solo lectura y pruebas) |

El proyecto de Supabase es **único y compartido**: una migración aplicada desde aquí afecta ya a la otra rama. Registra cada migración en la sección final de este archivo.

## 8. Pruebas y criterios de aceptación

Comandos: `npx vue-tsc --noEmit` · `npm test -- --run` · `npm run build` · `npm run test:integration` (solo si tocas datos/RLS/RPC, mesurando el límite de autenticación).

Criterios por tarea: tabla del plan (sección B). Transversales (sección G): typecheck/tests/build limpios; interfaz vista en navegador real a 390px y escritorio; CHANGELOG con "Qué se cambió / Verificado de verdad / Sin verificar".

Específicos de esta rama:
- **Stripe**: solo claves `sk_test_`; comprobar `.env` antes de cada prueba. Ningún pago real. No tocar Stripe/RPC de pago sin explicar impacto y confirmar.
- **Onboarding**: probar con cuentas **nuevas** creadas por `/onboarding`, no con las demo (`creator@feedma.test`/`partner@feedma.test`: las usa la otra rama); borrar las de prueba al terminar. Saltar el tour debe dejarlo cerrado en el siguiente login, no solo en esa pestaña. Nunca debe bloquear la app ni reaparecer en cada inicio de sesión.
- **Verificaciones (C-F1, C-S3)**: documentar en el CHANGELOG qué se pulsó, con qué cuenta y qué ocurrió, también los fallos.
- **C-L2**: probar el borrado solo con cuentas de prueba creadas para ello.
- Rate limit de Supabase Auth: "Request rate limit reached" es un límite, no un fallo de tu código; espera.

## 9. Fuera de tu responsabilidad

Todo lo relacionado con redes sociales (OAuth, tokens, métricas, sincronización, perfil↔redes, `social_accounts`, `metrics`) y el rediseño de publicaciones (Tablero, edición, revisión). Son de `feature/publicaciones-ux`.

## 10. Integración y prevención de conflictos

1. `git fetch origin` y `git merge main` en la rama antes de cada sesión.
2. Commits pequeños, `git add` de archivos concretos, sin secretos.
3. Avisar a Mario antes de: tocar un archivo de la sección 6, aplicar migración/RPC/policy, añadir dependencias, lanzar `test:integration`.
4. Prohibido: `git push --force`, `git reset --hard`, `git clean -fd` y fusionar esta rama con `feature/publicaciones-ux`.
5. Cuando una tarea cumpla sus criterios: PR hacia `main`. Tras fusionar la primera de las dos ramas, la otra hace `git merge main` y re-verifica los archivos compartidos.
6. Comandos útiles: `git branch --show-current` · `git diff main...feature/onboarding --stat` · `git log main..feature/onboarding --oneline`.

---

## Anexo — diseño previsto del onboarding (heredado del README anterior)

- Contenido: bienvenida breve, recorrido por los apartados principales, una primera acción recomendada por rol, posibilidad de saltarlo y de volver a verlo. Recorridos distintos para creador y partner.
- `app/utils/nav.ts` (`roleMeta`) ya tiene `label`/`description`/`home`/`icon` por rol, útil como punto de partida para los textos.
- `app/pages/confirm.vue` es donde aterriza alguien tras confirmar el email: sitio natural para decidir "primera vez", pero cambiarlo afecta a cada alta; compártelo antes.
- Anclar el tour a elementos estables (rutas de navegación, landmarks con `aria-label`), no a la estructura interna de pantallas que cambian en la otra rama.
- Diseñar y revisar con Mario antes de construir, tal como pidió el usuario. No debe aparecer en cada login ni bloquear la app.
- `README.md` raíz y `docs/5-FRONTEND-WORK-SPLIT.md` están desactualizados; para el estado real usa `docs/CHANGELOG.md`, `docs/CONTEXTO_PROYECTO_FEEDMA.md`, `docs/PENDIENTES.md` y el plan.

## Registro de migraciones aplicadas desde esta rama

| Fecha | Archivo | Qué cambia | Aprobada por |
|---|---|---|---|
| — | — | (ninguna todavía) | — |
