/**
 * Lógica pura de la paleta de comandos (Cmd/Ctrl+K): qué entra, cómo se busca y en qué orden salen los resultados.
 * Sin Vue ni red: la paleta (CommandPalette.vue) reúne los elementos y esto los filtra, para poder probarlo aparte.
 */
export type PaletteGroup = 'goto' | 'action' | 'collab' | 'post' | 'chat' | 'profile'

export interface PaletteItem {
  id: string
  group: PaletteGroup
  label: string
  /** Texto secundario (con quién, en qué fase…). También se busca en él. */
  hint?: string
  icon: string
  to: string
  /** Palabras extra para encontrarlo («nueva», «crear»…), sin acentos ni mayúsculas. */
  keywords?: string
}

/** Orden en que salen los grupos y su título. */
export const PALETTE_GROUPS: { value: PaletteGroup; label: string }[] = [
  { value: 'goto', label: 'Ir a' },
  { value: 'action', label: 'Acciones' },
  { value: 'collab', label: 'Colaboraciones' },
  { value: 'post', label: 'Publicaciones' },
  { value: 'chat', label: 'Conversaciones' },
  { value: 'profile', label: 'Perfiles' }
]

/** Sin acentos, en minúsculas y con los espacios recortados: «Reseña» y «resena» coinciden. */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Puntuación de un elemento para una búsqueda: 0 si no coincide. Todas las palabras escritas tienen que aparecer
 * (en cualquier orden); cuenta más empezar por ellas el título que encontrarlas dentro, y más el título que el resto.
 */
export function scoreItem(item: PaletteItem, query: string): number {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return 1
  const label = normalize(item.label)
  const rest = normalize(`${item.hint ?? ''} ${item.keywords ?? ''}`)
  const words = label.split(/[\s·\-–—/]+/)
  let total = 0
  for (const t of tokens) {
    if (label.startsWith(t)) total += 100
    else if (words.some((w) => w.startsWith(t))) total += 60
    else if (label.includes(t)) total += 30
    else if (rest.includes(t)) total += 10
    else return 0
  }
  return total
}

/**
 * Elementos que se enseñan: sin texto, solo «Ir a» y «Acciones» (lo demás sería un volcado de todo); con texto, los que
 * coinciden, por grupo y de mejor a peor dentro de cada grupo, con un tope por grupo para que la lista no se desborde.
 */
export function filterPalette(items: PaletteItem[], query: string, perGroup = 6): PaletteItem[] {
  const empty = !normalize(query)
  const out: PaletteItem[] = []
  for (const { value } of PALETTE_GROUPS) {
    if (empty && value !== 'goto' && value !== 'action') continue
    const inGroup = items.filter((i) => i.group === value)
    if (empty) { out.push(...inGroup); continue }
    out.push(
      ...inGroup
        .map((item) => ({ item, score: scoreItem(item, query) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, perGroup)
        .map((x) => x.item)
    )
  }
  return out
}
