import { creatorPosts } from '~/utils/mock-data'
import type { Post } from '~/types'

/**
 * Copia reactiva y compartida de `creatorPosts`, para que editar un post en
 * el detalle se refleje en el tablero y en "Hoy" sin recargar la página.
 * Vive solo en memoria del navegador (useState de Nuxt) — no persiste entre
 * recargas; eso llega con Supabase en la Fase 2.
 */
export function useCreatorPosts() {
  return useState<Post[]>('creator-posts', () => creatorPosts.map((p) => ({ ...p })))
}
