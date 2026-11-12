import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  access_token_encrypted: string | null
  token_expires_at: string | null
}

/**
 * POST /api/social/instagram-sync — refresco manual del número de
 * seguidores (botón "Actualizar" en Redes/Métricas). La lógica vive en
 * `server/utils/social-sync.ts` y la comparte con la sincronización
 * programada (`sync-all.post.ts`); aquí solo se autentica al usuario, se
 * localiza su cuenta y se traduce el resultado.
 *
 * Deliberadamente fuera de esta versión: alcance/interacciones reales
 * (`/insights`) — los nombres de métrica exactos para "Instagram API with
 * Instagram Login" hay que verificarlos contra una app de verdad antes de
 * escribir ese código a ciegas; de momento `creator/metrics.vue` es
 * honesto sobre que esa parte no está conectada todavía.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceUserRateLimit(event, 'social-sync', user.sub)

  const config = useRuntimeConfig(event)
  if (!config.socialTokenEncryptionKey) {
    throw createError({ statusCode: 500, statusMessage: 'Falta SOCIAL_TOKEN_ENCRYPTION_KEY en el servidor.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden sincronizar redes sociales.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, access_token_encrypted, token_expires_at')
    .eq('creator_id', creator.id)
    .eq('platform', 'instagram')
    .maybeSingle<SocialAccountRow>()
  if (!account?.access_token_encrypted) throw createError({ statusCode: 404, statusMessage: 'No tienes Instagram conectado todavía.' })

  try {
    const result = await syncInstagramAccount(
      client,
      { id: account.id, access_token_encrypted: account.access_token_encrypted, token_expires_at: account.token_expires_at },
      { socialTokenEncryptionKey: config.socialTokenEncryptionKey }
    )
    return { followersCount: result.followersCount }
  } catch (err) {
    // Errores ya controlados (422, 500 al guardar): se devuelven tal cual.
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/instagram-sync] fallo al sincronizar:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('instagram', classified)
  }
})
