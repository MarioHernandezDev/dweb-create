import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface SocialAccountRow {
  id: string
  access_token_encrypted: string
}

interface InstagramProfile {
  followers_count?: number
}

/**
 * POST /api/social/instagram-sync — refresco manual del número de
 * seguidores (botón "Actualizar" en Redes/Métricas). No hay ningún cron
 * todavía que lo haga solo (ver docs/9-INSTAGRAM-OAUTH-SETUP.md §5), así
 * que por ahora esto es la única forma de que el dato no se quede
 * congelado en el momento de conectar la cuenta.
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

  const config = useRuntimeConfig(event)
  if (!config.socialTokenEncryptionKey) {
    throw createError({ statusCode: 500, statusMessage: 'Falta SOCIAL_TOKEN_ENCRYPTION_KEY en el servidor.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden sincronizar redes sociales.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, access_token_encrypted')
    .eq('creator_id', creator.id)
    .eq('platform', 'instagram')
    .maybeSingle<SocialAccountRow>()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'No tienes Instagram conectado todavía.' })

  const accessToken = decryptToken(account.access_token_encrypted, config.socialTokenEncryptionKey)

  try {
    const profile = await $fetch<InstagramProfile>('https://graph.instagram.com/v21.0/me', {
      params: { fields: 'followers_count', access_token: accessToken }
    })

    if (profile.followers_count === undefined) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Instagram no ha devuelto el número de seguidores — reconecta la cuenta para conceder el permiso de insights.'
      })
    }

    const { error } = await client
      .from('social_accounts')
      .update({ followers_count: profile.followers_count, ...successPatch() } as never)
      .eq('id', account.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { followersCount: profile.followers_count }
  } catch (err) {
    // Errores ya controlados arriba (422, 500 al guardar): se devuelven tal cual.
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/instagram-sync] fallo al sincronizar:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError('instagram', classified)
  }
})
