import { serverSupabaseServiceRole } from '#supabase/server'

interface ActivityEvent {
  type: 'signup' | 'collaboration_created' | 'payment' | 'pro_paid' | 'pro_gifted'
  summary: string
  createdAt: string
}

function euros(cents: number | null) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
}

/**
 * Feed cronológico de "cosas que han pasado" — registros, colaboraciones
 * propuestas, pagos (de colaboración y de Pro) — montado leyendo las
 * tablas que ya existen, sin una tabla de eventos aparte que instrumentar
 * en cada sitio del código. Las últimas ~20 de cada fuente, mezcladas y
 * recortadas a 40; para un equipo de 2 personas sobra de margen.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const client = serverSupabaseServiceRole(event)

  const [profilesRes, collabsRes, subsRes] = await Promise.all([
    client.from('profiles').select('full_name, role, created_at').order('created_at', { ascending: false }).limit(20),
    client
      .from('collaborations')
      .select('created_at, paid_at, budget_cents, creators(display_name), partners(company_name)')
      .order('created_at', { ascending: false })
      .limit(20),
    client.from('subscriptions').select('created_at, stripe_subscription_id, creators(display_name)').order('created_at', { ascending: false }).limit(20)
  ])

  if (profilesRes.error) throw createError({ statusCode: 500, statusMessage: profilesRes.error.message })
  if (collabsRes.error) throw createError({ statusCode: 500, statusMessage: collabsRes.error.message })
  if (subsRes.error) throw createError({ statusCode: 500, statusMessage: subsRes.error.message })

  const events: ActivityEvent[] = []

  for (const p of profilesRes.data as { full_name: string | null; role: string; created_at: string }[]) {
    events.push({
      type: 'signup',
      summary: `${p.full_name ?? 'Alguien'} se ha registrado como ${p.role === 'creator' ? 'creador de contenido' : 'partner'}`,
      createdAt: p.created_at
    })
  }

  for (const c of collabsRes.data as {
    created_at: string
    paid_at: string | null
    budget_cents: number | null
    creators: { display_name: string } | null
    partners: { company_name: string } | null
  }[]) {
    const partnerName = c.partners?.company_name ?? 'Un partner'
    const creatorName = c.creators?.display_name ?? 'un creador'
    events.push({ type: 'collaboration_created', summary: `${partnerName} propuso una colaboración a ${creatorName}`, createdAt: c.created_at })
    if (c.paid_at) {
      events.push({ type: 'payment', summary: `${partnerName} pagó ${euros(c.budget_cents)} a ${creatorName}`, createdAt: c.paid_at })
    }
  }

  for (const s of subsRes.data as { created_at: string; stripe_subscription_id: string | null; creators: { display_name: string } | null }[]) {
    const creatorName = s.creators?.display_name ?? 'un creador'
    events.push({
      type: s.stripe_subscription_id ? 'pro_paid' : 'pro_gifted',
      summary: `${creatorName} se hizo Pro (${s.stripe_subscription_id ? 'pago real' : 'regalo del equipo'})`,
      createdAt: s.created_at
    })
  }

  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { events: events.slice(0, 40) }
})
