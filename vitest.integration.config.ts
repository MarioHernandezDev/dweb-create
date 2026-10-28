import { defineConfig } from 'vitest/config'

// Carga .env a mano (sin depender de --env-file en el script de npm, que en
// Windows/PowerShell es más frágil de encadenar) — mismo criterio que ya usan
// scripts/seed-*.mjs. Si no existe .env (p. ej. en CI sin secretos), se seguirá
// sin credenciales y los propios tests se saltarán solos (ver supabase-setup.ts).
try {
  process.loadEnvFile('.env')
} catch {
  // sin .env — los tests de integración se saltan solos, no es un error aquí.
}

/**
 * Tests de integración — contra el proyecto REAL de Supabase (REST sobre
 * HTTPS, igual que la app), autenticados como las cuentas de demo. Prueban
 * RLS, funciones `security definer` y permisos tal como los aplicaría
 * Postgres de verdad, no una simulación. Necesitan SUPABASE_URL/ANON_KEY
 * en el entorno (ver .env) y red de salida — se saltan solos (ver
 * tests/integration/supabase-setup.ts) si no están disponibles, en vez de
 * fallar en rojo por un motivo que no es un bug del código.
 *
 * Ejecutar con: npm run test:integration (carga .env con --env-file aparte,
 * ver ese script en package.json).
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Un archivo a la vez: comparten el mismo Supabase y las mismas cuentas
    // demo (y varios crean filas de prueba en el mismo creador), y el límite
    // de autenticación es compartido. En paralelo se pisaban entre sí.
    fileParallelism: false
  }
})
