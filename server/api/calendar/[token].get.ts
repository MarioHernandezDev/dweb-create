import { serverSupabaseServiceRole } from '#supabase/server'
import { buildFeedIcs, parseFeedToken, type FeedCollab, type FeedPost } from '../../../app/utils/calendar-feed'

/**
 * Calendario suscribible (.ics) de las fechas de entrega de una persona. El «login» es el propio token del enlace
 * (UUID aleatorio, renovable desde la app: tabla `calendar_feeds`). Solo sale título y fecha de las entregas. Un token
 * desconocido o mal formado responde igual (404) para no confirmar que existen otros.
 */
const ACTIVE = ['accepted', 'in_progress', 'completed']
type Row = Record<string, unknown>

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, `calendar:${clientIp(event)}`, 60, 10 * 60_000)
  const token = parseFeedToken(getRouterParam(event, 'token'))
  if (!token) throw createError({ statusCode: 404, statusMessage: 'No encontrado' })

  const client = serverSupabaseServiceRole(event)
  const { data: feed } = await client.from('calendar_feeds').select('profile_id').eq('token', token).maybeSingle()
  const profileId = (feed as { profile_id: string } | null)?.profile_id
  if (!profileId) throw createError({ statusCode: 404, statusMessage: 'No encontrado' })

  const [{ data: creator }, { data: partner }] = await Promise.all([
    client.from('creators').select('id').eq('profile_id', profileId).maybeSingle(),
    client.from('partners').select('id').eq('profile_id', profileId).maybeSingle()
  ])
  const COLLAB_COLS = 'id, campaign_name, package_title, brief'
  const POST_COLS = 'id, title, due_date, collaboration_id, status'
  let role: 'creator' | 'partner'
  let collabRows: Row[] = []
  let postRows: Row[] = []

  if (creator) {
    role = 'creator'
    const id = (creator as { id: string }).id
    const [collabs, posts] = await Promise.all([
      client.from('collaborations').select(COLLAB_COLS).eq('creator_id', id).in('status', ACTIVE),
      client.from('posts').select(POST_COLS).eq('creator_id', id).not('due_date', 'is', null).limit(1000)
    ])
    collabRows = (collabs.data ?? []) as Row[]
    postRows = (posts.data ?? []) as Row[]
  } else if (partner) {
    role = 'partner'
    const id = (partner as { id: string }).id
    const collabs = await client.from('collaborations').select(COLLAB_COLS).eq('partner_id', id).in('status', ACTIVE)
    collabRows = (collabs.data ?? []) as Row[]
    const ids = collabRows.map((c) => String(c.id))
    if (ids.length) {
      const posts = await client.from('posts').select(POST_COLS).in('collaboration_id', ids).not('submitted_at', 'is', null).not('due_date', 'is', null).limit(1000)
      postRows = (posts.data ?? []) as Row[]
    }
  } else {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado' })
  }

  const collabs: FeedCollab[] = collabRows.map((c) => ({ id: String(c.id), campaignName: (c.campaign_name as string | null) ?? null, packageTitle: (c.package_title as string | null) ?? null, brief: String(c.brief ?? '') }))
  const posts: FeedPost[] = postRows.map((p) => ({ id: String(p.id), title: String(p.title ?? ''), dueDate: (p.due_date as string | null) ?? null, collaborationId: (p.collaboration_id as string | null) ?? null, status: String(p.status ?? '') }))

  const origin = appRedirectUrl(process.env.APP_URL, '/').replace(/\/$/, '') || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  setResponseHeaders(event, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="ciberan-entregas.ics"',
    'Cache-Control': 'private, max-age=300',
    'X-Robots-Tag': 'noindex'
  })
  return buildFeedIcs({ role, posts, collabs, origin, today: new Date().toISOString().slice(0, 10) })
})
