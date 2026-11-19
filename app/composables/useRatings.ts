import type { RatingSummary } from '~/utils/ratings'

export interface CollaborationRating {
  id: string
  collaborationId: string
  raterProfileId: string
  rateeProfileId: string
  stars: number
  comment: string | null
  createdAt: string
}

interface RatingRow {
  id: string
  collaboration_id: string
  rater_profile_id: string
  ratee_profile_id: string
  stars: number
  comment: string | null
  created_at: string
}

function mapRow(row: RatingRow): CollaborationRating {
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    raterProfileId: row.rater_profile_id,
    rateeProfileId: row.ratee_profile_id,
    stars: row.stars,
    comment: row.comment,
    createdAt: row.created_at
  }
}

/**
 * Valoraciones mutuas de colaboraciones completadas. `myRatings` cachea,
 * por id de colaboración, la valoración que YO ya envié — así una card ya
 * valorada no vuelve a ofrecer el formulario tras navegar. El resumen
 * público (`fetchSummary`) nunca se cachea: se pide fresco cada vez que se
 * visita un perfil, mismo criterio que `usePublicProfile.ts`.
 */
export function useRatings() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const myRatings = useState<Record<string, CollaborationRating>>('my-collaboration-ratings', () => ({}))
  const loaded = useState<boolean>('my-collaboration-ratings-loaded', () => false)
  const submitting = useState<string | null>('collaboration-ratings-submitting', () => null)
  const submitError = useState<string>('collaboration-ratings-submit-error', () => '')

  async function ensureMyRatingsLoaded() {
    // useSupabaseUser() son los claims del JWT: el id del usuario va en `sub`
    // (con `.id` esta consulta salía con rater_profile_id=undefined → 400).
    const myId = user.value?.sub
    if (loaded.value || !myId) return myRatings.value

    const { data, error } = await client
      .from('collaboration_ratings')
      .select('id, collaboration_id, rater_profile_id, ratee_profile_id, stars, comment, created_at')
      .eq('rater_profile_id', myId)
    if (error) {
      console.error('[useRatings] fallo al cargar tus valoraciones:', error.message)
      return myRatings.value
    }

    const map: Record<string, CollaborationRating> = {}
    for (const row of data as RatingRow[]) map[row.collaboration_id] = mapRow(row)
    myRatings.value = map
    loaded.value = true
    return myRatings.value
  }

  async function submitRating(collaborationId: string, stars: number, comment?: string) {
    submitting.value = collaborationId
    submitError.value = ''
    try {
      const { data, error } = await client
        .rpc('submit_collaboration_rating' as never, {
          p_collaboration_id: collaborationId,
          p_stars: stars,
          p_comment: comment?.trim() || null
        } as never)
        .single()
      if (error) throw error

      const mapped = mapRow(data as RatingRow)
      myRatings.value = { ...myRatings.value, [collaborationId]: mapped }
      return mapped
    } catch (e) {
      submitError.value = (e as { message?: string })?.message ?? 'No se ha podido enviar la valoración. Inténtalo de nuevo.'
      throw e
    } finally {
      submitting.value = null
    }
  }

  /** Media + nº de valoraciones recibidas por un perfil (profiles.id) — visible para cualquier autenticado. */
  async function fetchSummary(profileId: string): Promise<RatingSummary> {
    const { data, error } = await client.rpc('profile_rating_summary' as never, { p_profile_id: profileId } as never).single()
    if (error) {
      console.error('[useRatings] fallo al cargar el resumen de valoraciones:', error.message)
      return { avgStars: 0, ratingCount: 0 }
    }
    const row = data as { avg_stars: number; rating_count: number }
    return { avgStars: Number(row.avg_stars) || 0, ratingCount: row.rating_count }
  }

  function reset() {
    myRatings.value = {}
    loaded.value = false
    submitting.value = null
    submitError.value = ''
  }

  return { myRatings, loaded, submitting, submitError, ensureMyRatingsLoaded, submitRating, fetchSummary, reset }
}
