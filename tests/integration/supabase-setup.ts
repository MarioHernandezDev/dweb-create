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
const DEMO_PASSWORD = 'feedma-demo-2026'

export const hasSupabaseEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export function anonClient(): SupabaseClient | null {
  if (!hasSupabaseEnv) return null
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
}

async function signIn(email: string): Promise<{ client: SupabaseClient; userId: string } | null> {
  const client = anonClient()
  if (!client) return null
  const { data, error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD })
  if (error || !data.user) {
    console.error(`[integration setup] no se pudo autenticar ${email}:`, error?.message)
    return null
  }
  return { client, userId: data.user.id }
}

export function creatorSession() {
  return signIn('creator@feedma.test')
}

export function partnerSession() {
  return signIn('partner@feedma.test')
}
