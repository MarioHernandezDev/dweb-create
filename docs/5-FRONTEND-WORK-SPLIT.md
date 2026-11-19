# 5. Reparto de trabajo del frontend (ahora mismo)

> ⚠️ **Documento histórico, superado.** Describe el reparto de la Fase 1 (frontend con datos de ejemplo, 3 roles: manager/influencer/cliente). El rol Manager se eliminó, los otros dos pasaron a `creator`/`partner`, y `app/pages/manager/`, `app/pages/client/` y `mock-data` como fuente de datos ya no son la realidad. **El reparto vigente es por funcionalidad, no por rol**: ver `README_TRABAJO.md` en las ramas `feature/publicaciones-ux` y `feature/onboarding`. Se conserva solo como referencia de la filosofía general (archivos compartidos con cuidado, PR antes de fusionar).

Este documento es para repartir lo que queda del frontend entre dos personas trabajando en el mismo repo a la vez, sin pisaros los cambios. Se centra en el trabajo *actual* (frontend con datos de ejemplo); el reparto del proyecto completo semana a semana sigue en [`4-ROADMAP-AND-TASKS.md`](./4-ROADMAP-AND-TASKS.md).

## 1. Cómo está organizado el código

El código está dividido por **vertical de rol**, casi sin solapamiento entre carpetas:

```
app/pages/manager/      → todo lo que ve el manager (gestiona su roster de influencers)
app/pages/creator/      → todo lo que ve el influencer (solo o representado por un manager)
app/pages/client/       → todo lo que ve la marca: calendario de su colaboración + descubrir talento

app/components/influencers/ → usado solo por manager
app/components/social/    → usado solo por creator
app/components/ml/        → usado solo por creator
app/components/timeline/  → COMPARTIDO (manager, creator y client lo usan)
app/components/charts/    → COMPARTIDO (métricas de manager y creator)
app/components/layout/    → COMPARTIDO (AppShell, nav, topbar)
app/components/ui/        → COMPARTIDO (botones, cards, etc.)

app/utils/mock-data.ts  → COMPARTIDO (datos de ejemplo de toda la app)
app/utils/nav.ts        → COMPARTIDO (navegación por rol)
app/utils/status.ts     → COMPARTIDO (estados de publicación)
app/assets/css/main.css → COMPARTIDO (sistema de diseño: colores, tipografía, radios)
nuxt.config.ts          → COMPARTIDO
```

Esto nos da una regla simple: **si trabajas dentro de `pages/manager/` o `pages/creator/`, casi nunca vas a tocar un archivo que toque la otra persona**. El riesgo de conflicto está concentrado en los archivos "COMPARTIDO" de la lista de arriba.

## 2. Reparto propuesto

| Persona | Vertical | Carpetas propias |
|---|---|---|
| **Persona A** | Manager | `app/pages/manager/**`, `app/components/influencers/**` |
| **Persona B** | Influencer | `app/pages/creator/**`, `app/components/social/**`, `app/components/ml/**` |

El **portal de marca** (`app/pages/client/**`: calendario + descubrir) es pequeño. Dejadlo para quien vaya más suelto esa semana, o hacedlo juntos en una sesión corta de pair-programming — no hace falta repartirlo.

## 3. Checklist de tareas pendientes de frontend (para repartir)

### Persona A — Manager
- [ ] Página de detalle de un post individual (abrir una entrega del tablero y ver/editar su información).
- [ ] Flujo de alta de un influencer nuevo en el roster, validaciones básicas.
- [ ] Estado vacío real cuando un influencer del roster no tiene entregas todavía.
- [ ] Conectar el toggle de "Notificaciones" del perfil (hoy dice "Próximamente").

### Persona B — Influencer
- [ ] Página de detalle de un post individual + edición tras guardarlo desde el composer.
- [ ] Onboarding de primer uso (bienvenida + elegir si trabajas solo o buscas manager + conectar la primera red social).
- [ ] Estado vacío real cuando no hay tendencias o no hay redes conectadas.
- [ ] Contador de créditos de predicción conectado a un estado real (hoy es un número fijo).

### Conjunto (coordinar antes de empezar)
- [ ] Portal de marca: vista de detalle de un post con comentarios.
- [ ] Que "Contactar" en `/client/discover` cree de verdad una solicitud (hoy es un mock que no persiste).
- [ ] Revisión de accesibilidad y mobile en las pantallas nuevas de cada uno.

## 4. Archivos compartidos — tocarlos con cuidado

Antes de editar uno de estos archivos, avisa en el chat del equipo. Si los vais a tocar los dos en la misma sesión, hacedlo en llamada para no duplicar trabajo:

- `app/utils/mock-data.ts` — si necesitas un dato de ejemplo nuevo, añádelo al final de su sección en vez de reescribir lo que ya existe.
- `app/utils/nav.ts`, `app/utils/status.ts`
- `app/assets/css/main.css` — el sistema de diseño (colores, tipografía, radios). Si os hace falta un token nuevo (un color, un tamaño), añadidlo; no renombréis los que ya existen sin avisar, porque los usan ambas verticales.
- `nuxt.config.ts`
- `app/components/ui/**` y `app/components/layout/**` — si os falta un componente base nuevo (un tipo de botón, una variante de card), creadlo como pieza nueva en vez de cambiar el comportamiento de uno que ya usa la otra persona.

## 5. Flujo de git para no pisaros

Con dos personas y sin CI todavía, lo más simple que funciona:

1. **Antes de empezar cualquier tarea**, actualiza tu `main` local:
   ```
   git checkout main
   git pull
   ```
2. **Crea una rama por tarea**, no una rama gigante por persona:
   ```
   git checkout -b feature/manager-detalle-post
   ```
   (`feature/manager-...` o `feature/creator-...` según de quién sea, así se ve de un vistazo quién está en qué).
3. Comitea seguido, con mensajes claros. Commits pequeños son más fáciles de fusionar que uno enorme al final del día.
4. Cuando la tarea esté lista, **haz push y abre un Pull Request** aunque seáis solo dos — deja rastro de qué cambió y por qué, y es el momento de hacer una revisión rápida cruzada antes de fusionar.
5. Fusiona a `main` y borra la rama.
6. **La otra persona hace `git pull origin main` antes de arrancar su siguiente tarea**, para partir siempre del código más reciente.

### Si hay conflicto de verdad

Casi siempre va a pasar en uno de los archivos "compartidos" de la sección 4. Si te sale un conflicto:
- No elijas "el mío" o "el suyo" a ciegas — lee las dos versiones, casi siempre hay que *combinar* ambos cambios (por ejemplo, dos tokens de color nuevos, uno de cada uno).
- Si no está claro, resolvedlo juntos en llamada en vez de adivinar.

## 6. Próximos pasos relacionados

- Arquitectura general: [`1-ARCHITECTURE.md`](./1-ARCHITECTURE.md)
- Roadmap completo del proyecto (incluye backend): [`4-ROADMAP-AND-TASKS.md`](./4-ROADMAP-AND-TASKS.md)
