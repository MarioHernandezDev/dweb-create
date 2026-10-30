import type { SupabaseClient } from '@supabase/supabase-js'
import { recordAccountSnapshot, snapshotFromInstagram, snapshotFromYoutube } from './account-snapshot'
import { refreshAccountPostMetricsBestEffort } from './post-metrics-sync'
import { successPatch } from './social-account-state'
import { decryptToken, encryptToken } from './token-crypto'
import { fetchYoutubeChannel, refreshYoutubeAccessToken } from './youtube'
import { instagramRefreshDecision } from './sync-batch'

/**
 * Sincronización de UNA cuenta: la comparten el botón manual de Redes
 * (`instagram-sync.post.ts`, `youtube-sync.post.ts`) y el endpoint programado
 * (`sync-all.post.ts`) — una sola lógica, no dos sistemas. Estas funciones
 * lanzan el error tal cual; quien las llama decide qué hacer con él
 * (clasificarlo, guardarlo en la cuenta y responder).
 */

interface SocialSyncConfig {
  socialTokenEncryptionKey: string
  youtubeClientId?: string
  youtubeClientSecret?: string
}

/** Tope por llamada a Meta, igual que el de las llamadas a Google en `youtube.ts`. */
const META_FETCH_TIMEOUT_MS = 8_000

export async function syncYoutubeAccount(
  client: SupabaseClient,
  account: { id: string; refresh_token_encrypted: string },
  config: SocialSyncConfig
): Promise<{ followersCount: number }> {
  if (!config.youtubeClientId || !config.youtubeClientSecret) {
    throw createError({ statusCode: 500, statusMessage: 'YouTube no está configurado todavía en el servidor.' })
  }

  const refreshToken = decryptToken(account.refresh_token_encrypted, config.socialTokenEncryptionKey)
  const refreshed = await refreshYoutubeAccessToken(refreshToken, config.youtubeClientId, config.youtubeClientSecret)
  const channels = await fetchYoutubeChannel(refreshed.access_token)
  const stats = channels.items?.[0]?.statistics
  // Histórico propio (A-R8a): se guarda lo que el canal SÍ da (visualizaciones, vídeos) aunque oculte
  // los suscriptores; ese campo queda null, nunca 0. Nunca hace fallar la sincronización.
  await recordAccountSnapshot(client, account.id, snapshotFromYoutube(stats))
  if (!stats || stats.hiddenSubscriberCount) {
    throw createError({
      statusCode: 422,
      statusMessage: 'YouTube no ha devuelto el número de suscriptores — puede que el canal los tenga ocultos en su configuración.'
    })
  }

  const subscriberCount = Number(stats.subscriberCount ?? 'NaN')
  if (!Number.isFinite(subscriberCount)) {
    throw createError({ statusCode: 422, statusMessage: 'YouTube ha devuelto un número de suscriptores inválido.' })
  }

  const { error } = await client
    .from('social_accounts')
    .update({
      followers_count: subscriberCount,
      access_token_encrypted: encryptToken(refreshed.access_token, config.socialTokenEncryptionKey),
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      ...successPatch()
    } as never)
    .eq('id', account.id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Métricas de las publicaciones vinculadas (A-R8b): efecto secundario que no hace fallar la sincronización.
  await refreshAccountPostMetricsBestEffort(client, 'youtube', account.id, refreshed.access_token)

  return { followersCount: subscriberCount }
}

interface InstagramTokenRefresh {
  access_token: string
  expires_in: number
}

interface InstagramProfile {
  followers_count?: number
}

export async function syncInstagramAccount(
  client: SupabaseClient,
  account: { id: string; access_token_encrypted: string; token_expires_at: string | null },
  config: SocialSyncConfig
): Promise<{ followersCount: number; tokenRefreshed: boolean }> {
  let accessToken = decryptToken(account.access_token_encrypted, config.socialTokenEncryptionKey)
  let tokenRefreshed = false

  // Renovación del token (~60 días, A-R2): Meta solo deja renovar tokens con
  // más de 24 h de vida que no hayan caducado.
  const decision = instagramRefreshDecision(account.token_expires_at, new Date())
  if (decision === 'expired') {
    // La fecha de caducidad ya pasó: no se llama a Meta, se trata como el error 190 que devolvería.
    throw Object.assign(new Error('Token de Instagram caducado (fecha de caducidad superada).'), {
      response: { status: 400 },
      data: { error: { code: 190, error_subcode: 463 } }
    })
  }
  if (decision === 'refresh') {
    const renewed = await $fetch<InstagramTokenRefresh>('https://graph.instagram.com/refresh_access_token', {
      params: { grant_type: 'ig_refresh_token', access_token: accessToken },
      timeout: META_FETCH_TIMEOUT_MS
    })
    accessToken = renewed.access_token
    const encrypted = encryptToken(accessToken, config.socialTokenEncryptionKey)
    // Se guarda YA el token nuevo: si lo que viene después falla, no se pierde.
    const { error } = await client
      .from('social_accounts')
      .update({
        access_token_encrypted: encrypted,
        // Instagram no da un refresh_token aparte: el propio token se renueva contra sí mismo.
        refresh_token_encrypted: encrypted,
        token_expires_at: new Date(Date.now() + renewed.expires_in * 1000).toISOString()
      } as never)
      .eq('id', account.id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    tokenRefreshed = true
  }

  const profile = await $fetch<InstagramProfile>('https://graph.instagram.com/v21.0/me', {
    params: { fields: 'followers_count', access_token: accessToken },
    timeout: META_FETCH_TIMEOUT_MS
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

  await recordAccountSnapshot(client, account.id, snapshotFromInstagram(profile.followers_count))

  await refreshAccountPostMetricsBestEffort(client, 'instagram', account.id, accessToken)

  return { followersCount: profile.followers_count, tokenRefreshed }
}
