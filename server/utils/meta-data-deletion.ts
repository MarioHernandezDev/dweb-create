import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Borra la cuenta de Instagram conectada que corresponde a un usuario de Meta
 * (A-R4). Lo comparten «Desautorizar» y «Eliminación de datos». Las filas que
 * dependen de `social_accounts` (vínculos de publicaciones, instantáneas y métricas)
 * se borran en cascada por sus claves ajenas. Idempotente: si no hay cuenta (ya se
 * borró, o nunca estuvo conectada), no es un error y devuelve 0.
 *
 * El `userId` solo es de fiar si viene de un `signed_request` verificado
 * (`verifyMetaSignedRequest`); esta función no lo comprueba.
 */
export async function deleteInstagramAccountByExternalId(client: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await client
    .from('social_accounts')
    .delete()
    .eq('platform', 'instagram')
    .eq('external_account_id', userId)
    .select('id')
  if (error) throw error
  return (data ?? []).length
}
