import { serverSupabaseServiceRole } from '#supabase/server'

interface ProfileRow {
  id: string
  role: string
  full_name: string | null
  created_at: string
}
interface CreatorRow { id: string; profile_id: string; display_name: string }
interface PartnerRow { id: string; profile_id: string; company_name: string; verified_at: string | null }
interface SubscriptionRow { creator_id: string; plan_id: string; status: string; current_period_end: string | null }

/**
 * Lista de cuentas para el panel de admin — cruza `profiles` (de dónde
 * sale el rol) con `auth.users` (email, si está baneada) y, si es
 * creadora, su suscripción. Pensado para un equipo de 2 personas mirando
 * una tabla pequeña, no para escalar a miles de usuarios: un solo
 * `listUsers` sin paginar de verdad.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  const [profilesRes, authRes, creatorsRes, partnersRes, subsRes] = await Promise.all([
    client.from('profiles').select('id, role, full_name, created_at').order('created_at', { ascending: false }),
    client.auth.admin.listUsers({ perPage: 1000 }),
    client.from('creators').select('id, profile_id, display_name'),
    client.from('partners').select('id, profile_id, company_name, verified_at'),
    client.from('subscriptions').select('creator_id, plan_id, status, current_period_end')
  ])

  if (profilesRes.error) throw createError({ statusCode: 500, statusMessage: profilesRes.error.message })
  if (authRes.error) throw createError({ statusCode: 500, statusMessage: authRes.error.message })

  const authById = new Map(authRes.data.users.map((u) => [u.id, u]))
  const creatorByProfile = new Map(((creatorsRes.data ?? []) as CreatorRow[]).map((c) => [c.profile_id, c]))
  const partnerByProfile = new Map(((partnersRes.data ?? []) as PartnerRow[]).map((p) => [p.profile_id, p]))
  const subByCreatorId = new Map(((subsRes.data ?? []) as SubscriptionRow[]).map((s) => [s.creator_id, s]))

  const users = ((profilesRes.data ?? []) as ProfileRow[]).map((profile) => {
    const authUser = authById.get(profile.id)
    const creator = creatorByProfile.get(profile.id)
    const partner = partnerByProfile.get(profile.id)
    const subscription = creator ? subByCreatorId.get(creator.id) : undefined

    return {
      id: profile.id,
      email: authUser?.email ?? null,
      fullName: profile.full_name,
      role: profile.role,
      createdAt: profile.created_at,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      bannedUntil: authUser?.banned_until ?? null,
      creatorId: creator?.id ?? null,
      partnerVerified: partner ? !!partner.verified_at : null,
      displayName: creator?.display_name ?? partner?.company_name ?? null,
      planId: subscription?.plan_id ?? null,
      planStatus: subscription?.status ?? null,
      planExpiresAt: subscription?.current_period_end ?? null
    }
  })

  return { users }
})
