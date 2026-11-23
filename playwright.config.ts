import { defineConfig, devices } from '@playwright/test'

// Variables E2E_* opcionales en .env.e2e (ignorado por git). Sin ellas, los tests que
// necesitan sesión se saltan solos y solo corren los públicos.
try { process.loadEnvFile('.env') } catch { /* sin .env */ }
try { process.loadEnvFile('.env.e2e') } catch { /* sin .env.e2e: solo tests públicos */ }

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

/**
 * Tests de extremo a extremo (navegador real, Chrome del sistema: no descarga nada).
 * - `public`: sin sesión (landing, login, guardas de ruta, responsive).
 * - `setup`: inicia sesión con las cuentas de E2E_* y guarda el estado en tests/e2e/.auth/.
 * - `creator` / `partner`: flujos autenticados de cada rol.
 * Se ejecutan contra la app ya levantada (`npm run dev`) o la levantan ellos mismos.
 * Escriben solo filas con el prefijo «[E2E]» y las borran al terminar. NO van a CI (base compartida).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  // Un reintento: el servidor de desarrollo compila bajo demanda y, en una pasada larga, alguna prueba puede ir lenta.
  retries: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL, channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'es-ES' },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    { name: 'public', testMatch: /public\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'creator', testMatch: /creator\.spec\.ts/, dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState: 'tests/e2e/.auth/creator.json' }
    },
    {
      name: 'partner', testMatch: /partner\.spec\.ts/, dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState: 'tests/e2e/.auth/partner.json' }
    }
  ]
})
