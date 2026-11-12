import { serverSupabaseServiceRole } from '#supabase/server'
import { isPublicRole, isUuid, toGuestProfile, type GuestProfilePayload } from '../../../../utils/public-profile'

/**
 * Ficha pública para quien no ha iniciado sesión (enlace compartible).
 *
 * La base de datos no da nada al rol anónimo: esta ruta lee con la clave de
 * servicio y devuelve solo la lista cerrada de `toGuestProfile`. Respeta el
 * interruptor «perfil visible sin sesión» de la cuenta y responde 404 tanto si
 * la ficha no existe como si está oculta, para no confirmar que existe.
 */
export default defineEventHandler(async (event): Promise<GuestProfilePayload> => {
  enforceRateLimit(event, `public-profile:${clientIp(event)}`, 60, 60_000)

  const role = getRouterParam(event, 'role')
  const id = getRouterParam(event, 'id')
  if (!isPublicRole(role) || !isUuid(id)) throw createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })

  const client = serverSupabaseServiceRole(event)
  const notFound = () => createError({ statusCode: 404, statusMessage: 'Perfil no encontrado' })

  const columns = role === 'creator'
    ? 'id, profile_id, display_name, bio, categories, looking_for, cover_url, created_at, headline, location'
    : 'id, profile_id, company_name, industry, bio, categories, looking_for, cover_url, created_at, headline, location, website, collaboration_types'
  const { data: row, error } = await client.from(role === 'creator' ? 'creators' : 'partners').select(columns).eq('id', id).maybeSingle<Record<string, unknown>>()
  if (error || !row) throw notFound()

  const { data: account } = await client.from('profiles').select('avatar_url, public_profile_enabled').eq('id', row.profile_id as string)
    .maybeSingle<{ avatar_url: string | null; public_profile_enabled: boolean }>()
  if (!account || account.public_profile_enabled === false) throw notFound()

  const rpc = async (fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
    const { data, error: rpcError } = await client.rpc(fn as never, args as never)
    if (rpcError) { console.error(`[perfil público] ${fn}:`, rpcError.message); return [] }
    return Array.isArray(data) ? (data as Record<string, unknown>[]) : data ? [data as Record<string, unknown>] : []
  }

  const [content, activity, rating] = await Promise.all([
    role === 'creator' ? rpc('get_public_creator_content', { p_creator_id: id }) : Promise.resolve([]),
    rpc('get_public_activity', { p_role: role, p_id: id }),
    rpc('profile_rating_summary', { p_profile_id: row.profile_id })
  ])

  // Cinco minutos de caché compartida: una ficha enlazada desde fuera no golpea la base en cada visita.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300')

  return {
    profile: toGuestProfile(role, row, account.avatar_url),
    content: content.map(publicContentItem),
    activity: { collabCount: Number(activity[0]?.collab_count) || 0, responseHours: activity[0]?.response_hours == null ? null : Number(activity[0].response_hours) },
    rating: { avgStars: Number(rating[0]?.avg_stars) || 0, ratingCount: Number(rating[0]?.rating_count) || 0 }
  }
})
