import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Infraestructura compartida de los tests de integración: autentica las dos
 * cuentas de demo (creator@feedma.test / partner@feedma.test, mismas que
 * usa login.vue en desarrollo) contra el proyecto REAL de Supabase sobre
 * HTTPS — exactamente lo mismo que hace la app, no un mock.
 *
 * Si no hay credenciales en el entorno (CI sin secretos, por ejemplo), las
 * funciones de aquí devuelven `null` y los tests que las usan se saltan
 * solos con `it.skipIf` — un entorno sin red/credenciales no es un fallo
 * del código, es un entorno distinto.
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
// La contraseña de las cuentas demo viene del .env (DEMO_PASSWORD), nunca del código.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD

export const hasSupabaseEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export function anonClient(): SupabaseClient | null {
  if (!hasSupabaseEnv) return null
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
}

async function signIn(email: string): Promise<{ client: SupabaseClient; userId: string } | null> {
  const client = anonClient()
  if (!client) return null
  if (!DEMO_PASSWORD) {
    console.error('[integration setup] falta DEMO_PASSWORD en el .env: no se puede iniciar sesión con las cuentas demo.')
    return null
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD })
  if (error || !data.user) {
    console.error(`[integration setup] no se pudo autenticar ${email}:`, error?.message)
    return null
  }
  return { client, userId: data.user.id }
}

export function creatorSession() {
  return signIn(process.env.TEST_CREATOR_EMAIL ?? 'creator@feedma.test')
}

export function partnerSession() {
  return signIn(process.env.TEST_PARTNER_EMAIL ?? 'partner@feedma.test')
}

/** Un perfil real sin ninguna relación con creator@/partner@feedma.test — para probar que un ajeno no puede leer/escribir algo que no es suyo. Mismas credenciales de demo (ver scripts/seed-discover-demo.mjs). */
export function unrelatedCreatorSession() {
  return signIn('mateo.rivas@feedma.test')
}
