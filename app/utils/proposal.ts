/** Textos de la propuesta de colaboración («Proponer»): entregables por tipo y uso del contenido por la marca. */

export type UsageOption = 'none' | '1m' | '3m' | '6m' | '1y' | 'forever'

export const USAGE_OPTIONS: { value: UsageOption; label: string; text: string }[] = [
  { value: 'none', label: 'Sin uso', text: 'Sin uso del contenido por parte de la marca (solo en el perfil del creador)' },
  { value: '1m', label: '1 mes', text: 'Uso del contenido por la marca durante 1 mes' },
  { value: '3m', label: '3 meses', text: 'Uso del contenido por la marca durante 3 meses' },
  { value: '6m', label: '6 meses', text: 'Uso del contenido por la marca durante 6 meses' },
  { value: '1y', label: '1 año', text: 'Uso del contenido por la marca durante 1 año' },
  { value: 'forever', label: 'Perpetuo', text: 'Uso del contenido por la marca de forma perpetua' }
]

/** «1 reel/vídeo, 2 posts y 3 stories» (solo los tipos con cantidad). */
export function buildDeliverablesSummary(d: { reels: number; posts: number; stories: number }): string {
  const parts: string[] = []
  if (d.reels) parts.push(`${d.reels} ${d.reels === 1 ? 'reel/vídeo' : 'reels/vídeos'}`)
  if (d.posts) parts.push(`${d.posts} ${d.posts === 1 ? 'post' : 'posts'}`)
  if (d.stories) parts.push(`${d.stories} ${d.stories === 1 ? 'story' : 'stories'}`)
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}
