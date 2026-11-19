---
name: app-project-engineer
description: Desarrollo y mantenimiento de CIBERAN (Nuxt 4 + Supabase, marketplace de creadores y partners). Úsala al añadir, cambiar, corregir o revisar código, migraciones, estilos o tests de este repositorio.
---

# app-project-engineer — CIBERAN

Ingeniero del proyecto. Cambios mínimos, coherentes y verificados. Lo que no esté en las referencias o en el código es **desconocido**: se comprueba con una búsqueda concreta, no se supone.

## Flujo (siempre)

1. **Alcance.** Haz solo lo pedido. Si algo adyacente parece mal, anótalo en la respuesta; no lo arregles sin que lo pidan.
2. **Localiza.** Busca con `grep`/`find` antes de leer. Lee solo los archivos que vas a tocar y sus llamadores directos. No hagas auditorías generales ni releas lo ya comprobado en la sesión.
3. **Reutiliza.** Antes de crear un componente, composable, util o clase CSS, busca si ya existe uno equivalente (`app/components/ui`, `app/composables`, `app/utils`, `server/utils`).
4. **Efectos secundarios.** Antes de modificar, busca quién usa lo que cambias (`grep -rn "<símbolo>" app server tests`). Un cambio en tabla, RPC, política RLS o util de `server/utils` exige revisar a todos sus consumidores.
5. **Implementa** siguiendo `references/development-rules.md` (lee solo la sección que toque).
6. **Verifica** con lo mínimo pertinente (ver «Verificación») y di qué ejecutaste y qué no.

## Cuándo leer cada referencia (carga progresiva)

| Tarea | Lee |
|---|---|
| Tocar páginas, rutas, composables, endpoints, auth o integraciones | [architecture.md](references/architecture.md) |
| Tocar estilos, tokens, componentes de UI o maquetación | [design-system.md](references/design-system.md) |
| Migraciones, tablas, RPC, RLS, Storage | [database.md](references/database.md) |
| Saber si una funcionalidad existe, está apagada o aplazada | [features.md](references/features.md) |
| Planificar, priorizar o decidir si algo toca una fase futura | [roadmap.md](references/roadmap.md) |
| Dudas de convenciones, seguridad, tests, commits | [development-rules.md](references/development-rules.md) |

Tareas pequeñas (un texto, un bug local): no abras ninguna referencia salvo que el cambio toque algo de la tabla.

## Reglas inamovibles

- **Métricas de redes sociales: aplazadas.** Viven solo en `docs/17-METRICAS-REDES-PROXIMAMENTE.md` y en carpetas `_disabled`. No importes nada de `_disabled`, no las muestres en ninguna pantalla activa y no crees dependencias hacia ellas. Detalle en [features.md](references/features.md).
- **Interruptores apagados** (`PAYMENTS_ENABLED`, `PREDICTIONS_ENABLED`, `GOOGLE_AUTH_ENABLED`): no los actives ni cambies su valor por defecto sin petición expresa.
- **No** simular integraciones sin credenciales, **no** añadir dependencias nuevas sin necesidad justificada, **no** exponer claves en el cliente.
- Servicios externos, costes, acciones irreversibles y borrado de datos reales: pregunta antes.
- Respuestas y textos de interfaz en **español**.

## Verificación

| Cambio | Comprobación |
|---|---|
| Cualquier `.ts`/`.vue` | `npm run typecheck` |
| Lógica en `utils`/`server/utils` | `npx vitest run tests/unit/<fichero>.spec.ts`, y `npm test` si toca varios módulos |
| Migración | `npx vitest run tests/unit/migrations-rollback.spec.ts` (ROLLBACK y versión única) |
| Pantalla o estilo | Mirar en navegador a 390 px y escritorio; si no es posible, decirlo |
| Antes de cerrar un cambio grande | `npm test` + `npm run typecheck` (+ `npm run build` si tocó configuración) |

Los tests de integración (`npm run test:integration`) escriben en la base compartida: solo a petición.
