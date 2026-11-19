# Reglas de desarrollo

Lee solo la sección que necesites.

## Estilo de código (observado en el repo)

- TypeScript, `<script setup lang="ts">`, **sin punto y coma**, comillas simples, 2 espacios.
- Comentarios y mensajes de usuario en **español**; explican el *porqué* (decisiones, riesgos), no repiten el código.
- Nombres: componentes `PascalCase.vue`, composables `useX.ts`, utils en `kebab-case.ts`, endpoints `nombre.<método>.ts` (`delete.post.ts`).
- Componentes sin prefijo de carpeta (`components: pathPrefix:false`): el nombre debe ser **único** en todo `app/components`.
- Composables: acceden a datos (Supabase con sesión, RLS) y exponen estado; la **lógica pura va a `app/utils`/`server/utils`** para poder testearla sin red.

## Antes de crear algo nuevo

1. `grep`/`find` por nombre y por función (¿ya existe un composable, util, componente de `ui` o clase CSS?).
2. Si existe algo parecido, **extiéndelo** o reutilízalo; no dupliques.
3. Nueva dependencia npm solo con justificación clara y petición/aprobación; revisa si `@vueuse/core` o lo existente ya lo cubre.
4. Página pública nueva → añadirla a `redirectOptions.exclude` en `nuxt.config.ts`. Variable nueva → `.env.example` + `runtimeConfig`.

## Estados de interfaz

Toda pantalla con datos cubre carga, vacío y error con los componentes compartidos (`SkeletonBlock`, `EmptyState`, `LoadingOverlay`, `ToastHost`, `translateAuthError`/`error-message.ts`). Nada de datos ficticios, valores provisionales ni «funciones a medias» visibles: si no está lista, no se enseña (o se presenta como «Próximamente» sin lógica, como las métricas de redes).

## Seguridad

- Nunca claves en el cliente ni en el repo; `service_role` solo en `server/`.
- Endpoint con usuario: 401 sin sesión, `enforceUserRateLimit`, validar y recortar el cuerpo, comprobar propiedad cuando uses service role. Un test exige sesión + límite en cada endpoint con usuario y sesión de admin en `/api/admin/*`: no lo rompas.
- Mensajes de error y recuperación que **no revelen** si un email existe.
- Privacidad (RGPD): no enviar a terceros más datos de los necesarios (la IA solo recibe el texto de la consulta).
- Tokens de correo (baja, etc.) firmados con HMAC; no los pongas en logs.
- Pagos: toda acción con dinero respeta `PAYMENTS_ENABLED` en interfaz **y** servidor (`payments-gate.ts`).

## Datos

Ver `database.md` («Reglas de migración»). Resumen: migración única, no destructiva, con ROLLBACK, RLS en tablas nuevas, `EXECUTE` revocado en funciones nuevas, nada de tocar datos reales, y la lógica de estado va en RPC/triggers, no en el cliente.

## Tests

- Unitarios en `tests/unit/<tema>.spec.ts` (vitest, entorno node, sin red ni secretos). Un cambio de lógica pura lleva su test; un bug corregido, su test de regresión.
- Integración (`tests/integration`, `npm run test:integration`): escriben en la base compartida; solo a petición.
- Lo que está en `_disabled` queda **fuera** de `include` de vitest; no lo muevas a `tests/unit` salvo reactivación explícita.
- Comandos: `npm run typecheck` (`vue-tsc -b`; sin `-b` no revisa nada), `npm test`, `npm run build`. CI ejecuta typecheck + unitarias + build.
- Si no puedes ejecutar algo (navegador, red, base), dilo; no lo des por verificado.

## Código aplazado (`_disabled`)

No se importa, no se edita salvo reactivación pedida, no se borra. Si una tarea parece necesitarlo, para y pregunta. Un fichero fuera de `_disabled` que lo importe es un error: `grep -rn "_disabled" app server tests/unit nuxt.config.ts` debe devolver solo comentarios/documentación.

## Git

- Commit/push solo si se pide. Mensaje en español, imperativo o descriptivo, sin ruido. Añade la atribución que indique el entorno.
- No incluyas `.env`, secretos, `.nuxt`, `.output` ni binarios sueltos. Archivos de la raíz como `competencia.md`, `plan-imp.md`, `references/` son material del propietario: no los commitees ni los muevas sin pedirlo.
- En Windows hay ficheros que solo difieren en saltos de línea (CRLF): antes de commitear, revisa `git diff --stat --ignore-space-at-eol` y no incluyas los que no tengan cambios reales.

## Comunicación

Respuestas cortas: qué cambió, qué verificaste y qué no, y siguientes pasos si los hay. Sin recapitular pasos, sin documentos nuevos salvo petición, sin repetir lo que ya está en el roadmap.
