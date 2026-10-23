import { defineConfig } from 'vitest/config'

/**
 * Tests unitarios/puros — sin red, sin Supabase real, rápidos. Pensados
 * para ejecutarse siempre (CI, pre-commit...) sin depender de secretos ni
 * de que haya conectividad. Los tests de integración (contra Supabase real)
 * viven aparte, en vitest.integration.config.ts — no se mezclan porque
 * necesitan credenciales y red, y no deben bloquear un `npm test` normal.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node'
  }
})
