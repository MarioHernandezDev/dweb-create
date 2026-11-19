import type { CollaborationStatus, Platform, Post } from '~/types'
import { collabPhase, collabTitle, paymentState, type CollabPhase } from '~/utils/collab-phase'

/**
 * Las colaboraciones de quien está logueado, en una sola forma para los dos roles (tablero, lista y calendario de
 * «Colaboraciones»). Reúne lo que ya cargan `useMyCollaborations`/`useCollabRequests` y las publicaciones de cada
 * colaboración; la fase y el estado del pago se deducen (ver utils/collab-phase.ts). Nada nuevo en base de datos.
 */
export interface HubItem {
  id: string
  counterpart: string
  status: CollaborationStatus
  initiatedBy: 'creator' | 'partner'
  brief: string
  title: string
  /** Nombre de campaña elegido por quien envió la solicitud (si lo puso). */
  campaignName: string | null
  budgetCents: number | null
  paidAt: string | null
  createdAt: string
  expiresAt: string | null
  scopeNotes: string | null
  usageRights: string | null
  phase: CollabPhase | null
  payment: 'paid' | 'pending' | 'none'
  platforms: Platform[]
  /** Próxima entrega sin publicar (o la última si ya está todo publicado), «YYYY-MM-DD». */
  dueDate: string | null
  posts: Post[]
}

export function useCollabHub(role: 'creator' | 'partner') {
  const partnerSide = useMyCollaborations()
  const { paymentsEnabled } = useLaunchMode()
  const creatorSide = useCollabRequests()
  const partnerPosts = usePartnerPosts()
  const myPosts = useMyPosts()

  async function load() {
    await Promise.all(role === 'partner'
      ? [partnerSide.ensureLoaded(), partnerPosts.ensureLoaded()]
      : [creatorSide.ensureLoaded(), myPosts.ensureLoaded()])
  }

  const items = computed<HubItem[]>(() => {
    const posts = role === 'partner' ? partnerPosts.posts.value : myPosts.posts.value
    const byCollab = new Map<string, Post[]>()
    for (const p of posts) if (p.collaborationId) byCollab.set(p.collaborationId, [...(byCollab.get(p.collaborationId) ?? []), p])

    const source = role === 'partner'
      ? partnerSide.collaborations.value.map((c) => ({ ...c, counterpart: c.creatorName ?? 'Sin asignar' }))
      : creatorSide.requests.value.map((c) => ({ ...c, counterpart: c.partnerName }))

    return source.map((c) => {
      const mine = (byCollab.get(c.id) ?? []).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      const open = mine.filter((p) => p.status !== 'published')
      const due = (open[0] ?? mine[mine.length - 1])?.dueDate ?? null
      return {
        id: c.id,
        counterpart: c.counterpart,
        status: c.status,
        initiatedBy: c.initiatedBy,
        brief: c.brief,
        title: collabTitle(c),
        campaignName: c.campaignName?.trim() || null,
        budgetCents: c.budgetCents,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        scopeNotes: c.scopeNotes,
        usageRights: c.usageRights,
        phase: collabPhase(c, mine),
        payment: paymentState(c, paymentsEnabled),
        platforms: [...new Set(mine.map((p) => p.platform))],
        dueDate: due,
        posts: mine
      }
    })
  })

  return { items, load }
}
