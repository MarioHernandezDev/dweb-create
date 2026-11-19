import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, describe, expect, it } from 'vitest'
import { hasSupabaseEnv } from './supabase-setup'

/**
 * H0-17: supabase/migrations/20261103160000_restore_handle_new_user.sql
 *
 * El trigger de alta (`handle_new_user`) vivo era una versión antigua que no
 * creaba la ficha de creador/partner. Estos tests dan de alta cuentas de prueba
 * con la Admin API (igual que un alta real dispara el trigger) y comprueban ficha,
 * créditos y aviso de bienvenida. ANTES de aplicar la migración fallan; DESPUÉS pasan.
 *
 * ESCRIBEN EN EL SUPABASE COMPARTIDO: cada cuenta se borra al terminar (el borrado
 * del usuario arrastra perfil, ficha, créditos y avisos). Solo con RUN_SOCIAL_ACCOUNTS_RLS=1.
 */
const enabled = hasSupabaseEnv && process.env.RUN_SOCIAL_ACCOUNTS_RLS === '1' && !!process.env.SUPABASE_SERVICE_ROLE_KEY

describe.skipIf(!enabled)('alta de cuenta: handle_new_user crea perfil, ficha y bienvenida (Supabase real)', () => {
  const admin: SupabaseClient = enabled
    ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    : (null as never)
  const created: string[] = []

  async function signup(role: 'creator' | 'partner') {
    const { data, error } = await admin.auth.admin.createUser({
      email: `h0-17-${role}-${randomUUID().slice(0, 8)}@feedma.test`,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { role, full_name: 'Prueba H0-17', name: role === 'partner' ? 'Empresa H0-17' : 'Prueba H0-17' }
    })
    expect(error).toBeNull()
    created.push(data.user!.id)
    return data.user!.id
  }

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id)
  })

  it('un creador nuevo tiene perfil, ficha, 3 créditos de bienvenida y aviso', async () => {
    const id = await signup('creator')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', id).single()
    expect((profile as { role: string }).role).toBe('creator')
    const { data: ficha } = await admin.from('creators').select('id').eq('profile_id', id).maybeSingle()
    expect(ficha).not.toBeNull()
    const { data: credits } = await admin.from('credit_ledger').select('amount').eq('creator_id', (ficha as { id: string }).id)
    expect(((credits ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0)).toBe(3)
    const { data: welcome } = await admin.from('notifications').select('id').eq('profile_id', id).eq('type', 'welcome')
    expect(welcome ?? []).toHaveLength(1)
  })

  it('un partner nuevo tiene perfil, ficha y aviso', async () => {
    const id = await signup('partner')
    const { data: ficha } = await admin.from('partners').select('id').eq('profile_id', id).maybeSingle()
    expect(ficha).not.toBeNull()
    const { data: welcome } = await admin.from('notifications').select('id').eq('profile_id', id).eq('type', 'welcome')
    expect(welcome ?? []).toHaveLength(1)
  })
})
