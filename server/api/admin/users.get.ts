import { serverSupabaseServiceRole } from '#supabase/server'

interface UserRow {
  id: string; email: string | null; full_name: string | null; role: string; created_at: string; last_sign_in_at: string | null; banned: boolean
  creator_id: string | null; partner_verified: boolean | null; display_name: string | null
  plan_id: string | null; plan_status: string | null; plan_expires_at: string | null; deletion_pending: boolean
}

/**
 * Cuentas del panel de admin, paginadas y filtradas en la base (vista `admin_users_view`, que cruza perfiles,
 * login, fichas y suscripción). Parámetros: q (nombre, correo o id), role, plan, status (banned|active|deletion),
 * verified (yes|no), sort (recent|login|name), page, pageSize.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const { page, pageSize, from, to } = pageParams(q)
  const client = serverSupabaseServiceRole(event)

  let query = client.from('admin_users_view').select('*', { count: 'exact' })
  const term = searchTerm(q.q)
  if (term) query = UUID_RE.test(term) ? query.eq('id', term) : query.or(orIlike(['email', 'full_name', 'display_name'], term))
  if (q.role === 'creator' || q.role === 'partner') query = query.eq('role', q.role)
  if (q.plan === 'pro') query = query.eq('plan_id', 'pro')
  if (q.plan === 'free') query = query.eq('role', 'creator').or('plan_id.is.null,plan_id.neq.pro')
  if (q.status === 'banned') query = query.eq('banned', true)
  if (q.status === 'active') query = query.eq('banned', false)
  if (q.status === 'deletion') query = query.eq('deletion_pending', true)
  if (q.verified === 'yes') query = query.eq('partner_verified', true)
  if (q.verified === 'no') query = query.eq('partner_verified', false)
  if (q.sort === 'login') query = query.order('last_sign_in_at', { ascending: false, nullsFirst: false })
  else if (q.sort === 'name') query = query.order('display_name', { ascending: true, nullsFirst: false })
  else query = query.order('created_at', { ascending: false })

  const { data, error, count } = await query.order('id', { ascending: true }).range(from, to)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const users = ((data ?? []) as UserRow[]).map((u) => ({
    id: u.id, email: u.email, fullName: u.full_name, role: u.role, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at, banned: u.banned,
    creatorId: u.creator_id, partnerVerified: u.partner_verified, displayName: u.display_name,
    planId: u.plan_id, planStatus: u.plan_status, planExpiresAt: u.plan_expires_at, deletionPending: u.deletion_pending
  }))
  return { users, total: count ?? users.length, page, pageSize }
})
