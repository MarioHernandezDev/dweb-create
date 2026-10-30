import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Escritura del vínculo publicación ↔ contenido externo (A-R7) y de su borrado.
 * Separado del endpoint para probarlo contra la base real sin tener que hablar
 * con YouTube/Instagram. SOLO se llama DESPUÉS de que el endpoint haya comprobado
 * con el proveedor que el contenido pertenece a la cuenta conectada.
 */

export interface PostLink {
  external_id: string
  external_url: string | null
  platform: string
  verified_at: string
}

export type SaveLinkResult =
  | { ok: true; link: PostLink; replaced: boolean }
  | { ok: false; reason: 'duplicate' | 'error' }

export async function saveExternalLink(
  client: SupabaseClient,
  input: { postId: string; accountId: string; platform: 'youtube' | 'instagram'; externalId: string; externalUrl: string },
  now: Date = new Date()
): Promise<SaveLinkResult> {
  // Si ya había un vínculo a OTRO contenido, sus métricas describían ese otro contenido: mezclarlas sería inventar.
  const { data: previous } = await client.from('post_external_links').select('external_id').eq('post_id', input.postId).maybeSingle<{ external_id: string }>()
  const replaced = !!previous && previous.external_id !== input.externalId

  const { data: link, error } = await client
    .from('post_external_links')
    .upsert(
      {
        post_id: input.postId, social_account_id: input.accountId, platform: input.platform,
        external_id: input.externalId, external_url: input.externalUrl, verified_at: now.toISOString()
      } as never,
      { onConflict: 'post_id' }
    )
    .select('external_id, external_url, platform, verified_at')
    .single<PostLink>()
  if (error) {
    // 23505 = unicidad: el mismo contenido ya está vinculado a otra publicación de esta cuenta.
    if ((error as { code?: string }).code === '23505') return { ok: false, reason: 'duplicate' }
    console.error('[post-link-store] fallo al guardar el vínculo:', error.message)
    return { ok: false, reason: 'error' }
  }

  // Solo tras guardar el vínculo nuevo se borran las métricas del anterior (si falla lo de arriba no se pierde nada).
  if (replaced) {
    const { error: mErr } = await client.from('metrics').delete().eq('post_id', input.postId).not('source', 'is', null)
    if (mErr) console.error('[post-link-store] no se pudieron borrar las métricas del contenido anterior:', mErr.message)
  }
  return { ok: true, link: link as PostLink, replaced }
}

/** Borra el vínculo y las métricas guardadas de esa publicación. Idempotente. Devuelve si salió bien. */
export async function removeExternalLink(client: SupabaseClient, postId: string): Promise<boolean> {
  const { error: mErr } = await client.from('metrics').delete().eq('post_id', postId).not('source', 'is', null)
  if (mErr) {
    console.error('[post-link-store] fallo al borrar las métricas:', mErr.message)
    return false
  }
  const { error } = await client.from('post_external_links').delete().eq('post_id', postId)
  if (error) {
    console.error('[post-link-store] fallo al borrar el vínculo:', error.message)
    return false
  }
  return true
}
