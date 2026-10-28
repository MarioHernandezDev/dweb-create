import { serverSupabaseServiceRole } from '#supabase/server'

interface Candidate {
  id: string
  platform: 'youtube' | 'instagram'
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
}

/**
 * POST /api/social/sync-all — sincronización de las cuentas conectadas (A-R5).
 * Es INDEPENDIENTE DEL SCHEDULER: no sabe quién la llama, solo exige un
 * secreto compartido. Ahora mismo NO hay ningún scheduler que la invoque
 * (decisión Q3 pendiente: dónde se despliega la app); se puede probar a mano.
 *
 * Seguridad
 *  - `Authorization: Bearer <SYNC_CRON_SECRET>`, comparado en tiempo constante.
 *    Si el secreto no está configurado responde 503 y no hace nada (falla cerrado).
 *  - Los intentos con secreto incorrecto se limitan por IP (5 cada 10 min) y
 *    no revelan nada más que "no autorizado".
 *  - Máximo una ejecución por minuto (límite en memoria: vale para una sola
 *    instancia, por eso NO es la defensa principal contra solapes).
 *
 * Ejecuciones simultáneas
 *  - Cerrojo por cuenta en la base de datos (`sync_lock_until`, atómico): dos
 *    llamadas a la vez se reparten las cuentas sin duplicar trabajo, aunque
 *    haya varias instancias. Si un proceso muere, el cerrojo caduca solo.
 *
 * Idempotencia y límites
 *  - Solo cuentas verificadas en estado `connected`, no sincronizadas hace
 *    menos de 1 h ni intentadas hace menos de 15 min; lote máximo de 25, las
 *    más antiguas primero, 3 a la vez. Repetir la llamada no duplica nada.
 *  - Un fallo reconectable (caducado, revocado, faltan permisos) cambia el
 *    estado de la cuenta; uno temporal solo anota el código (ver
 *    server/utils/social-account-state.ts).
 *
 * Observabilidad
 *  - Devuelve solo recuentos y códigos (sin ids de cuenta ni datos personales)
 *    y los registra. Nunca se registran tokens ni respuestas crudas.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.syncCronSecret) {
    throw createError({ statusCode: 503, statusMessage: 'La sincronización programada no está configurada.' })
  }

  if (!verifyCronSecret(getHeader(event, 'authorization'), config.syncCronSecret)) {
    const failures = checkRateLimit(`sync-all-fail:${clientIp(event)}`, 5, 10 * 60_000)
    if (!failures.allowed) {
      setResponseHeader(event, 'Retry-After', String(failures.retryAfterSeconds))
      throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos.' })
    }
    throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  }

  const run = checkRateLimit('sync-all-run', 1, 60_000)
  if (!run.allowed) {
    setResponseHeader(event, 'Retry-After', String(run.retryAfterSeconds))
    throw createError({ statusCode: 429, statusMessage: 'Ya se ha lanzado una sincronización hace menos de un minuto.' })
  }

  if (!config.socialTokenEncryptionKey) {
    throw createError({ statusCode: 500, statusMessage: 'Falta SOCIAL_TOKEN_ENCRYPTION_KEY en el servidor.' })
  }
  const syncConfig = {
    socialTokenEncryptionKey: config.socialTokenEncryptionKey,
    youtubeClientId: config.youtubeClientId,
    youtubeClientSecret: config.youtubeClientSecret
  }

  const client = serverSupabaseServiceRole(event)
  const startedAt = Date.now()
  const cutoffs = syncCutoffs(new Date(startedAt))

  const { data: candidates, error } = await client
    .from('social_accounts')
    .select('id, platform, access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .in('platform', ['youtube', 'instagram'])
    .eq('is_verified', true)
    .eq('status', 'connected')
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoffs.syncedBefore}`)
    .or(`last_sync_attempt_at.is.null,last_sync_attempt_at.lt.${cutoffs.attemptedBefore}`)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(SYNC_BATCH_SIZE)
    .returns<Candidate[]>()
  if (error) {
    console.error('[social/sync-all] no se pudieron listar las cuentas:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'No se han podido listar las cuentas a sincronizar.' })
  }

  async function syncOne(account: Candidate): Promise<SyncAccountResult> {
    let locked: boolean
    try {
      locked = await acquireLease(client, account.id)
    } catch (err) {
      console.error('[social/sync-all] error al tomar el cerrojo:', describeErrorForLog(err))
      return { platform: account.platform, outcome: 'failed', code: 'lease_error' }
    }
    if (!locked) return { platform: account.platform, outcome: 'skipped_locked', code: 'locked' }

    try {
      if (account.platform === 'youtube') {
        if (!account.refresh_token_encrypted) throw createError({ statusCode: 422, statusMessage: 'sin token' })
        await syncYoutubeAccount(client, { id: account.id, refresh_token_encrypted: account.refresh_token_encrypted }, syncConfig)
      } else {
        if (!account.access_token_encrypted) throw createError({ statusCode: 422, statusMessage: 'sin token' })
        await syncInstagramAccount(
          client,
          { id: account.id, access_token_encrypted: account.access_token_encrypted, token_expires_at: account.token_expires_at },
          syncConfig
        )
      }
      return { platform: account.platform, outcome: 'ok', code: 'ok' }
    } catch (err) {
      // Errores propios (422 sin datos, 500 al guardar) no son del proveedor: se anotan como "desconocido".
      const info = isError(err)
        ? { kind: 'unknown' as const, code: err.statusCode === 422 ? 'unprocessable' : 'server_error', httpStatus: err.statusCode ?? null, reconnect: false }
        : classifyProviderError(err)
      console.error(`[social/sync-all] fallo en ${account.platform}:`, describeErrorForLog(err))
      await recordSyncFailure(client, account.id, info)
      return { platform: account.platform, outcome: 'failed', code: info.code }
    } finally {
      await releaseLease(client, account.id)
    }
  }

  const results = await mapWithConcurrency(candidates ?? [], SYNC_CONCURRENCY, syncOne)
  const summary = summarizeSync(results, startedAt, Date.now())
  console.log(`[social/sync-all] processed=${summary.processed} ok=${summary.ok} failed=${summary.failed} skipped=${summary.skipped} ms=${summary.durationMs}`)
  return summary
})
