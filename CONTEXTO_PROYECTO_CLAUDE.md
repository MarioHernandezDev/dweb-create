# CIBERAN — contexto para el proyecto de Claude

> Archivo corto pensado para chats de estrategia/producto. Para código, usar Claude Code con `CLAUDE.md` y la skill `app-project-engineer`. Detalle técnico: `PROJECT_OVERVIEW.md`, `ROADMAP.md`, `docs/`.

## Qué es
Marketplace de creadores de contenido y marcas/agencias («partners»). Stack: Nuxt 4 + Vue 3 + Tailwind 4 + Supabase + Nitro. Interfaz y comunicación: **español**. Repo: `dweb-create`.

## Estado
- Aún **no desplegada públicamente**. Los perfiles actuales son ficticios de prueba: no son usuarios reales ni hay tracción comercial que evaluar.
- Una sola base de Supabase compartida (desarrollo, pruebas y producción). No hay staging (decisión 12-11-2026). Al terminar se eliminan los perfiles de prueba sin tocar datos reales.
- Pagos (Stripe), predicción con IA y Google login: apagados por variable de entorno.
- Métricas de redes sociales: aplazadas a una fase futura («Próximamente»), aisladas del resto de la app.

## Hoja de ruta (en este orden)
1. **Terminar el producto**: completo, funcional, buena experiencia, incluido móvil. Mejoras pendientes: tablero, discover y negociaciones.
2. **Preparar el lanzamiento**: pruebas, seguridad, copias, despliegue, datos ficticios fuera de producción, legal listo para revisión profesional.
3. **Lanzamiento gratuito** para conseguir creadores y marcas reales (Stripe preparado, sin cobros activos).
4. **Monetización** más adelante: suscripciones, comisiones, planes.

## Criterios de decisión
- Sin funcionalidades por acumular, pero sin dejar incompleto lo que los usuarios necesiten desde el primer día.
- Las recomendaciones estratégicas deben respetar la hoja de ruta anterior.
- Las ideas nuevas de auditorías estratégicas no se implementan hasta que Alex decida cuáles merecen la pena.
- Se conserva la identidad visual actual (colores y tipografía).
- Integraciones que dependen de credenciales o servicios sin acceso (Stripe, métricas) quedan fuera por ahora.

## Reglas de trabajo
- Implementar directamente, sin más planes ni análisis de arquitectura, sin preguntar cada pequeña decisión.
- Sin commit ni push sin autorización de Alex.
- Nunca secretos en el código ni en el repositorio (`.env` fuera de git).
- Migraciones no destructivas, con bloque ROLLBACK.

## Dónde mirar
- `ROADMAP.md`: estado real y lista de trabajo.
- `docs/HOJA_DE_RUTA.md`: visión y alcance por fase.
- `DESIGN.md`: identidad visual.
- `CIBERAN_COMPETITIVE_AUDIT.md`, `competencia.md`: análisis de competencia.
