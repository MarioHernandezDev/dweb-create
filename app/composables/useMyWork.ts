import { collaborationWork, hasRated, type WorkCollab, type WorkRole, type WorkTask, type WorkWaiting } from '~/utils/collaboration-work'
import { formatEuros } from '~/utils/mock-data'
import { relativeTime } from '~/utils/status'

interface PendingOfferRow {
  id: string
  conversation_id: string
  from_profile_id: string
  proposed_price_cents: number
  package_title: string | null
  created_at: string
}

/**
 * «Qué me toca»: las acciones que de verdad dependen del usuario, calculadas
 * con datos que ya existen (colaboraciones, fase de sus publicaciones, la
 * cronología y las ofertas del chat pendientes de respuesta). Mismo cálculo
 * (`collaborationWork`) que el «Siguiente paso» de la página de colaboración,
 * así las dos pantallas no pueden contradecirse. No guarda nada.
 */
export function useMyWork() {
  const client = useSupabaseClient()
  const { role } = useMyRole()
  const { resolveMyProfileId } = useMyProfileId()
  const { requests, ensureLoaded: ensureRequests } = useCollabRequests()
  const { collaborations, ensureLoaded: ensureCollaborations } = useMyCollaborations()
  const { posts: myPosts, ensureLoaded: ensureMyPosts } = useMyPosts()
  const { posts: partnerPosts, ensureLoaded: ensurePartnerPosts } = usePartnerPosts()
  const { eventsByCollab, loadMany } = useCollabEvents()

  const myProfileId = useState<string | null>('my-work-profile-id', () => null)
  const offers = useState<WorkTask[]>('my-work-offers', () => [])
  const loaded = useState<boolean>('my-work-loaded', () => false)
  const loading = useState<boolean>('my-work-loading', () => false)

  const myRole = computed<WorkRole>(() => (role.value === 'partner' ? 'partner' : 'creator'))

  const collabs = computed<WorkCollab[]>(() =>
    myRole.value === 'partner'
      ? collaborations.value.map((c) => ({ ...c, counterpartName: c.creatorName ?? 'el creador' }))
      : requests.value.map((c) => ({ ...c, counterpartName: c.partnerName }))
  )
  const posts = computed(() => (myRole.value === 'partner' ? partnerPosts.value : myPosts.value))

  const computedWork = computed(() => {
    const tasks: WorkTask[] = []
    const waiting: WorkWaiting[] = []
    for (const c of collabs.value) {
      const events = eventsByCollab.value[c.id] ?? []
      const work = collaborationWork(myRole.value, c, posts.value, events, myProfileId.value)
      tasks.push(...work.tasks)
      if (work.waiting) waiting.push(work.waiting)
    }
    return { tasks, waiting }
  })

  const tasks = computed(() => [...offers.value, ...computedWork.value.tasks].sort((a, b) => a.priority - b.priority))
  const waiting = computed(() => computedWork.value.waiting)

  async function loadOffers(me: string) {
    const { data, error } = await client
      .from('offers')
      .select('id, conversation_id, from_profile_id, proposed_price_cents, package_title, created_at')
      .eq('to_profile_id', me)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.error('[useMyWork] fallo al cargar las ofertas pendientes:', error.message)
      return
    }
    const rows = (data ?? []) as PendingOfferRow[]
    const senderIds = [...new Set(rows.map((r) => r.from_profile_id))]
    const names: Record<string, string> = {}
    if (senderIds.length) {
      const [{ data: crs }, { data: prs }] = await Promise.all([
        client.from('creators').select('profile_id, display_name').in('profile_id', senderIds),
        client.from('partners').select('profile_id, company_name').in('profile_id', senderIds)
      ])
      for (const r of (crs ?? []) as { profile_id: string; display_name: string }[]) names[r.profile_id] = r.display_name
      for (const r of (prs ?? []) as { profile_id: string; company_name: string }[]) names[r.profile_id] = r.company_name
    }
    offers.value = rows.map((r) => {
      const who = names[r.from_profile_id] ?? 'Alguien'
      return {
        id: `offer:${r.id}`, kind: 'respond_offer', collaborationId: null, counterpartName: who, priority: 11,
        title: `Responde a la oferta de ${who}`,
        detail: `${r.package_title ? `«${r.package_title}» · ` : ''}${formatEuros(r.proposed_price_cents)} · ${relativeTime(r.created_at)}`,
        cta: 'Abrir chat', to: `/chat/${r.conversation_id}`
      }
    })
  }

  async function load(force = false) {
    if (loading.value || (loaded.value && !force)) return
    loading.value = true
    try {
      const me = await resolveMyProfileId()
      myProfileId.value = me
      if (myRole.value === 'partner') await Promise.all([ensureCollaborations(), ensurePartnerPosts()])
      else await Promise.all([ensureRequests(), ensureMyPosts()])
      await Promise.all([loadMany(collabs.value.map((c) => c.id)), me ? loadOffers(me) : Promise.resolve()])
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { tasks, waiting, loaded, loading, load, myRole, myProfileId, hasRated }
}
