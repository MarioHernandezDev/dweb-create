import type { Platform, Role } from '~/types'

export interface PublicContentItem {
  postId: string
  title: string
  platform: Platform
  contentType: string
  mediaUrl: string | null
  externalUrl: string | null
  publishedAt: string
}
export interface PublicCollab { id: string; name: string; completedAt: string }
export interface PublicActivity { collabCount: number; responseHours: number | null }
export interface SimilarProfile { id: string; name: string; coverUrl: string | null; categories: string[] }

const num = (v: unknown) => (v == null ? null : Number(v))

export function mapPublicContent(r: Record<string, unknown>): PublicContentItem {
  return {
    postId: r.post_id as string, title: r.title as string, platform: r.platform as Platform, contentType: r.content_type as string,
    mediaUrl: (r.media_url as string) ?? null, externalUrl: (r.external_url as string) ?? null,
    publishedAt: r.published_at as string
  }
}

/**
 * Lo que enseña el perfil público además de la ficha: contenido destacado, con quién ha
 * colaborado, actividad y perfiles parecidos. Todo sale de funciones de base de datos que solo devuelven agregados o lo
 * que su dueño eligió enseñar (migración 20261105140000). Si algo falla, esa parte queda vacía y el resto sigue.
 */
export function usePublicProfileExtras() {
  const client = useSupabaseClient()

  async function load(role: Role, id: string, categories: string[]) {
    const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T[]> => {
      const { data, error } = await client.rpc(fn as never, args as never)
      if (error) { console.error(`[perfil] ${fn}:`, error.message); return [] }
      return (data ?? []) as T[]
    }
    const table = role === 'creator' ? 'creators' : 'partners'
    const nameCol = role === 'creator' ? 'display_name' : 'company_name'

    const [content, collabs, activity, similar] = await Promise.all([
      role === 'creator' ? rpc<Record<string, unknown>>('get_public_creator_content', { p_creator_id: id }) : Promise.resolve([]),
      rpc<Record<string, unknown>>('get_public_collaborations', { p_role: role, p_id: id }),
      rpc<Record<string, unknown>>('get_public_activity', { p_role: role, p_id: id }),
      categories.length
        ? client.from(table).select(`id, ${nameCol}, cover_url, categories`).overlaps('categories', categories).neq('id', id).limit(6)
          .then(({ data }) => (data ?? []) as unknown as Record<string, unknown>[])
        : Promise.resolve([])
    ])

    return {
      content: content.map(mapPublicContent),
      collabs: collabs.map((r): PublicCollab => ({ id: r.counterpart_id as string, name: r.counterpart_name as string, completedAt: r.completed_at as string })),
      activity: ((): PublicActivity => {
        const a = activity[0]
        return { collabCount: Number(a?.collab_count) || 0, responseHours: num(a?.response_hours) }
      })(),
      similar: similar.map((r): SimilarProfile => ({ id: r.id as string, name: r[nameCol] as string, coverUrl: (r.cover_url as string) ?? null, categories: (r.categories as string[]) ?? [] }))
    }
  }

  return { load }
}
