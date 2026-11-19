# CIBERAN — instrucciones globales

Marketplace de creadores y marcas/agencias («partners»). Nuxt 4 + Vue 3 + Tailwind 4 + Supabase + Nitro. Interfaz y comunicación con el usuario: **español**.

Para desarrollar o modificar este repositorio, usa la skill `app-project-engineer` (`.claude/skills/app-project-engineer/SKILL.md`).

## Imprescindibles

- Haz solo lo pedido. Busca antes de leer; no releas ni audites en bloque.
- Reutiliza lo existente antes de crear nada nuevo.
- Las **métricas de redes sociales están aplazadas**: no son una funcionalidad activa ni deben generar dependencias (ver `docs/17-METRICAS-REDES-PROXIMAMENTE.md`). Nada fuera de `_disabled` importa de `_disabled`.
- Pagos, predicción con IA y Google login están **apagados** por variable de entorno; no los enciendas.
- No subas ni escribas secretos: `.env` nunca va a git.
- Una sola base de Supabase compartida (desarrollo, pruebas y producción): no borres ni modifiques datos reales sin permiso expreso; las migraciones deben ser no destructivas y traer bloque ROLLBACK.
- Comprueba con `npm run typecheck` y `npm test` antes de dar un cambio por bueno.
- Commit/push solo si se pide.
