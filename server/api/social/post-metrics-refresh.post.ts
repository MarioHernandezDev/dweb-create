import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface LinkRow {
  external_id: string
  social_account_id: string
  platform: string
}

interface AccountRow {
  id: string
  status: 'connected' | 'expired' | 'revoked' | 'missing_permissions'
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/social/post-metrics-refresh { postId } — vuelve a leer las métricas
 * de UNA publicación vinculada (A-R8b) y las guarda (una fila por día: pulsar
 * dos veces el mismo día actualiza la misma fila). Es el botón "Actualizar" de
 * la publicación mientras no haya sincronización programada.
 *
 * Solo el dueño de la publicación. Con la cuenta caducada/revocada no se llama
 * al proveedor. Si el contenido vinculado ya no existe (borrado o privado) se
 * responde `contentMissing` y NO se inventa ninguna fila.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })
  enforceRateLimit(event, `post-metrics-refresh:${user.sub}`, 10, 60_000)

  const body = await readBody<{ postId?: string }>(event)
  const postId = body?.postId
  if (typeof postId !== 'string' || !UUID.test(postId)) throw createError({ statusCode: 400, statusMessage: 'Publicación no válida.' })

  const config = useRuntimeConfig(event)
  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden actualizar métricas.' })

  const { data: post } = await client.from('posts').select('id').eq('id', postId).eq('creator_id', creator.id).maybeSingle<{ id: string }>()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Publicación no encontrada.' })

  const { data: link } = await client.from('post_external_links').select('external_id, social_account_id, platform').eq('post_id', post.id).maybeSingle<LinkRow>()
  if (!link) throw createError({ statusCode: 404, statusMessage: 'Esta publicación no está vinculada a ningún contenido.' })
  const platform = link.platform
  if (platform !== 'youtube' && platform !== 'instagram') throw createError({ statusCode: 422, statusMessage: 'Esta plataforma todavía no tiene métricas.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, status, access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('id', link.social_account_id)
    .eq('creator_id', creator.id)
    .maybeSingle<AccountRow>()
  if (!account) throw createError({ statusCode: 404, statusMessage: 'La cuenta de esta publicación ya no está conectada.' })
  if (account.status !== 'connected') {
    throw toSocialHttpError(platform, { kind: account.status, code: `stored_${account.status}`, httpStatus: null, reconnect: true })
  }
  if (!config.socialTokenEncryptionKey) throw createError({ statusCode: 500, statusMessage: 'El servidor no está configurado todavía.' })

  const ref = [{ postId: post.id, externalId: link.external_id }]
  try {
    if (platform === 'youtube') {
      if (!account.refresh_token_encrypted || !config.youtubeClientId || !config.youtubeClientSecret) {
        throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
      }
      const refreshed = await refreshYoutubeAccessToken(decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey), config.youtubeClientId, config.youtubeClientSecret)
      const result = await refreshYoutubePostMetrics(client, account.id, refreshed.access_token, ref)
      await recordSyncSuccess(client, account.id, {
        access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      })
      return { saved: result.saved, contentMissing: result.missing.length > 0 }
    }

    if (!account.access_token_encrypted) throw createError({ statusCode: 500, statusMessage: 'Instagram no está configurado todavía en el servidor.' })
    if (instagramRefreshDecision(account.token_expires_at, new Date()) === 'expired') {
      throw Object.assign(new Error('Token de Instagram caducado (fecha de caducidad superada).'), { response: { status: 400 }, data: { error: { code: 190, error_subcode: 463 } } })
    }
    const result = await refreshInstagramPostMetrics(client, account.id, decryptToken(account.access_token_encrypted, config.socialTokenEncryptionKey), ref)
    return { saved: result.saved, contentMissing: false }
  } catch (err) {
    if (isError(err)) throw err
    const classified = classifyProviderError(err)
    console.error('[social/post-metrics-refresh] fallo al leer las métricas:', describeErrorForLog(err))
    await recordSyncFailure(client, account.id, classified)
    throw toSocialHttpError(platform, classified)
  }
})
