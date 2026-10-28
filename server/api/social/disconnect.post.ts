import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface DisconnectBody {
  platform?: string
  /** Desconectar aunque no se haya podido confirmar la revocación en el proveedor. */
  force?: boolean
}

interface SocialAccountRow {
  id: string
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
}

/**
 * Resultado de la revocación en el proveedor:
 * - `revoked`: Google confirmó la revocación.
 * - `already_invalid`: el token ya no era válido.
 * - `unconfirmed`: no se pudo confirmar (solo con `force`).
 * - `not_supported`: Instagram no tiene endpoint de revocación documentado;
 *   el acceso se retira desde los ajustes de la cuenta de Instagram.
 * - `none`: no había token que revocar (fila antigua o de demo).
 */
export type DisconnectRevocation = 'revoked' | 'already_invalid' | 'unconfirmed' | 'not_supported' | 'none'

/**
 * POST /api/social/disconnect — desconexión completa (A-R3). Antes el
 * navegador solo borraba la fila de `social_accounts`: el permiso seguía
 * vivo en Google. Ahora el servidor revoca el token en el proveedor ANTES de
 * borrar, y no borra si no puede confirmar la revocación salvo que el usuario
 * lo pida expresamente (`force`), para no afirmar algo que no sabemos.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'No autenticado.' })

  const body = await readBody<DisconnectBody>(event)
  const platform = body?.platform
  if (platform !== 'youtube' && platform !== 'instagram') {
    throw createError({ statusCode: 400, statusMessage: 'Plataforma no válida.' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: creator } = await client.from('creators').select('id').eq('profile_id', user.sub).maybeSingle<{ id: string }>()
  if (!creator) throw createError({ statusCode: 403, statusMessage: 'Solo los creadores pueden desconectar redes sociales.' })

  const { data: account } = await client
    .from('social_accounts')
    .select('id, access_token_encrypted, refresh_token_encrypted')
    .eq('creator_id', creator.id)
    .eq('platform', platform)
    .maybeSingle<SocialAccountRow>()
  // Ya no hay nada conectado: la desconexión es idempotente.
  if (!account) return { ok: true, revocation: 'none' as DisconnectRevocation }

  let revocation: DisconnectRevocation = 'none'

  if (platform === 'youtube' && (account.refresh_token_encrypted || account.access_token_encrypted)) {
    const config = useRuntimeConfig(event)
    let outcome: 'revoked' | 'already_invalid' | 'unconfirmed' = 'unconfirmed'
    try {
      if (!config.socialTokenEncryptionKey) throw new Error('sin clave de cifrado')
      // Revocar el refresh token es lo que corta el acceso continuado.
      const token = decryptToken((account.refresh_token_encrypted ?? account.access_token_encrypted)!, config.socialTokenEncryptionKey)
      outcome = (await revokeGoogleToken(token)).outcome
    } catch (err) {
      console.error('[social/disconnect] no se pudo preparar la revocación:', describeErrorForLog(err))
    }
    revocation = outcome

    if (outcome === 'unconfirmed' && !body?.force) {
      throw createError({
        statusCode: 502,
        statusMessage: 'No hemos podido confirmar la revocación del acceso en YouTube (puede ser un problema temporal). Puedes reintentarlo o desconectar igualmente y quitar el acceso a mano.',
        data: { code: 'revoke_unconfirmed', platform }
      })
    }
  } else if (platform === 'instagram' && (account.access_token_encrypted || account.refresh_token_encrypted)) {
    revocation = 'not_supported'
  }

  const { error } = await client.from('social_accounts').delete().eq('id', account.id)
  if (error) {
    console.error('[social/disconnect] no se pudo borrar la fila:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'No se ha podido desconectar la cuenta.' })
  }

  return { ok: true, revocation }
})
