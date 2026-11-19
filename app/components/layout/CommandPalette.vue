<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { roleNav, secondaryNav } from '~/utils/nav'
import { collabContextLabel } from '~/utils/collab-phase'
import { statusMeta } from '~/utils/status'
import { filterPalette, PALETTE_GROUPS, type PaletteItem } from '~/utils/command-palette'
import type { Role } from '~/types'

/**
 * Paleta de comandos (Cmd/Ctrl+K): un solo sitio para saltar a una sección, lanzar una acción o encontrar una
 * colaboración, una publicación, una conversación o un perfil escribiendo unas letras. Se monta una vez en AppShell.
 * Accesible: es un diálogo con un cuadro combinado (input + lista de opciones), se maneja con flechas, Intro y Escape,
 * y devuelve el foco a donde estaba al cerrarse. Solo usa lo que la persona ya puede ver: nada nuevo se consulta salvo
 * la búsqueda de perfiles (la misma de la barra superior).
 */
const props = defineProps<{ role: Role }>()
const { open, toggle, hide } = useCommandPalette()
const router = useRouter()

const query = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
const isMac = import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform)

// Datos que ya tiene la app (se piden al abrir; son cachés compartidas con el resto de pantallas).
const hub = useCollabHub(props.role)
const { conversations, ensureConversations } = useChat()
const myPosts = useMyPosts()
const { results: profileResults, search: searchProfiles, clear: clearProfiles } = useProfileSearch()

const gotoItems = computed<PaletteItem[]>(() => [
  ...roleNav[props.role].filter((n) => !n.soon).map((n) => ({ id: `go:${n.to}`, group: 'goto' as const, label: n.label, icon: n.icon, to: n.to })),
  ...secondaryNav(props.role).map((n) => ({ id: `go:${n.to}`, group: 'goto' as const, label: n.label, icon: n.icon, to: n.to }))
])
const actionItems = computed<PaletteItem[]>(() => props.role === 'creator'
  ? [
      { id: 'act:new-post', group: 'action', label: 'Nueva publicación', icon: 'ph:plus-bold', to: '/creator/timeline?nueva=1', keywords: 'crear anadir idea' },
      { id: 'act:new-package', group: 'action', label: 'Crear un paquete', icon: 'ph:package-fill', to: '/creator/packages?nuevo=1', keywords: 'nuevo oferta precio' },
      { id: 'act:discover', group: 'action', label: 'Descubrir marcas', icon: 'ph:compass-bold', to: '/creator/discover', keywords: 'buscar contactar proponer' },
      { id: 'act:requests', group: 'action', label: 'Ver solicitudes de colaboración', icon: 'ph:handshake-fill', to: '/creator/requests?vista=solicitudes', keywords: 'pendientes responder contraoferta' }
    ]
  : [
      { id: 'act:discover', group: 'action', label: 'Descubrir creadores', icon: 'ph:compass-bold', to: '/partner/discover', keywords: 'buscar contactar proponer' },
      { id: 'act:new-need', group: 'action', label: 'Publicar una necesidad', icon: 'ph:package-fill', to: '/partner/packages?nuevo=1', keywords: 'nuevo crear paquete' },
      { id: 'act:requests', group: 'action', label: 'Ver solicitudes de colaboración', icon: 'ph:handshake-fill', to: '/partner/requests?vista=solicitudes', keywords: 'pendientes responder contraoferta' }
    ])
const dataItems = computed<PaletteItem[]>(() => {
  const out: PaletteItem[] = []
  for (const c of hub.items.value) {
    out.push({ id: `collab:${c.id}`, group: 'collab', label: collabContextLabel({ campaignName: c.campaignName, partnerName: c.counterpart }, c.title), hint: c.campaignName ? c.counterpart : c.title, icon: 'ph:handshake-fill', to: `/${props.role}/collaborations/${c.id}` })
  }
  if (props.role === 'creator') {
    for (const p of myPosts.posts.value) {
      out.push({ id: `post:${p.id}`, group: 'post', label: p.title, hint: statusMeta[p.status].label, icon: 'ph:kanban-fill', to: `/creator/post/${p.id}` })
    }
  }
  for (const c of conversations.value) {
    out.push({ id: `chat:${c.id}`, group: 'chat', label: c.otherName, hint: c.lastMessagePreview ?? '', icon: 'ph:chat-circle-fill', to: `/chat/${c.id}` })
  }
  for (const r of profileResults.value) {
    out.push({ id: `profile:${r.role}:${r.id}`, group: 'profile', label: r.name, hint: r.subtitle, icon: 'ph:user-circle-fill', to: `/profile/${r.role}/${r.id}` })
  }
  return out
})
const results = computed(() => filterPalette([...gotoItems.value, ...actionItems.value, ...dataItems.value], query.value))
const sections = computed(() => PALETTE_GROUPS
  .map((g) => ({ ...g, items: results.value.filter((i) => i.group === g.value) }))
  .filter((g) => g.items.length))
const flat = computed(() => sections.value.flatMap((s) => s.items))
const optionId = (i: number) => `cmdk-opt-${i}`

let debounce: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  active.value = 0
  if (debounce) clearTimeout(debounce)
  if (q.trim().length < 2) { clearProfiles(); return }
  debounce = setTimeout(() => searchProfiles(q), 250)
})
watch(flat, () => { if (active.value >= flat.value.length) active.value = Math.max(0, flat.value.length - 1) })

watch(open, async (isOpen) => {
  if (isOpen) {
    previousFocus = document.activeElement as HTMLElement | null
    query.value = ''
    active.value = 0
    document.body.style.overflow = 'hidden'
    // Datos para buscar: caché compartida, sin esperar (la lista se rellena sola al llegar).
    void ensureConversations().catch(() => {})
    void hub.load().catch(() => {})
    if (props.role === 'creator') void myPosts.ensureLoaded().catch(() => {})
    await nextTick()
    inputEl.value?.focus()
  } else {
    document.body.style.overflow = ''
    clearProfiles()
    previousFocus?.focus?.()
    previousFocus = null
  }
})

function choose(item: PaletteItem | undefined) {
  if (!item) return
  hide()
  router.push(item.to)
}
function move(delta: number) {
  if (!flat.value.length) return
  active.value = (active.value + delta + flat.value.length) % flat.value.length
  nextTick(() => document.getElementById(optionId(active.value))?.scrollIntoView({ block: 'nearest' }))
}
function onInputKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Enter') { e.preventDefault(); choose(flat.value[active.value]) }
  else if (e.key === 'Home') { e.preventDefault(); active.value = 0 }
  else if (e.key === 'End') { e.preventDefault(); active.value = Math.max(0, flat.value.length - 1) }
}
// Atajo global y Escape; el foco no sale del cuadro mientras está abierta (Tab se queda dentro).
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); return }
  if (!open.value) return
  if (e.key === 'Escape') { e.preventDefault(); hide() }
  else if (e.key === 'Tab') { e.preventDefault(); inputEl.value?.focus() }
})
onBeforeUnmount(() => { document.body.style.overflow = ''; if (debounce) clearTimeout(debounce) })
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="cmdk">
        <div v-if="open" class="cmdk" data-command-palette @mousedown.self="hide">
          <div class="cmdk__panel" role="dialog" aria-modal="true" aria-label="Buscar y acciones">
            <div class="cmdk__search">
              <Icon name="ph:magnifying-glass-bold" class="size-5 shrink-0" aria-hidden="true" />
              <input
                ref="inputEl" v-model="query" type="text" class="cmdk__input" placeholder="Busca o salta a…"
                role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"
                :aria-activedescendant="flat.length ? optionId(active) : undefined" aria-label="Buscar y acciones" @keydown="onInputKey"
              >
              <kbd class="cmdk__kbd" aria-hidden="true">Esc</kbd>
            </div>

            <div id="cmdk-list" ref="listEl" class="cmdk__list" role="listbox" aria-label="Resultados">
              <template v-for="s in sections" :key="s.value">
                <p class="cmdk__group" role="presentation">{{ s.label }}</p>
                <template v-for="item in s.items" :key="item.id">
                  <button
                    :id="optionId(flat.indexOf(item))" type="button" role="option" class="cmdk__item"
                    :class="flat.indexOf(item) === active && 'is-active'" :aria-selected="flat.indexOf(item) === active" tabindex="-1"
                    @mousemove="active = flat.indexOf(item)" @click="choose(item)"
                  >
                    <Icon :name="item.icon" class="cmdk__icon" aria-hidden="true" />
                    <span class="cmdk__label">{{ item.label }}</span>
                    <span v-if="item.hint" class="cmdk__hint">{{ item.hint }}</span>
                  </button>
                </template>
              </template>
              <p v-if="!flat.length" class="cmdk__empty" role="status">Nada coincide con «{{ query.trim() }}». Prueba con otra palabra o busca un perfil por su nombre.</p>
            </div>

            <p class="cmdk__foot" aria-hidden="true">
              <span><kbd>↑</kbd><kbd>↓</kbd> moverse</span>
              <span><kbd>↵</kbd> abrir</span>
              <span class="cmdk__foot-right">{{ isMac ? '⌘' : 'Ctrl' }} K para abrir o cerrar</span>
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
