// La base de datos no guarda iniciales ni matiz de color (es puro adorno de
// BaseAvatar): se derivan del nombre, así quedan estables entre recargas
// sin necesitar columnas para ello — mismo truco que `cover()` en
// mock-data.ts y `coverFromId()` en useMyPosts.

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words[0]![0] + (words[1]?.[0] ?? '')).toUpperCase()
}

export function hueFromString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return hash % 360
}

/**
 * Degradado grande derivado del nombre — mismo truco que `coverFromId()` en
 * useMyPosts.ts (código duplicado hasta ahora, unificado aquí), usado donde
 * hace falta una "foto" vistosa de fondo sin tener una real todavía: cards
 * de /creator/discover y /partner/discover cuando el creador/partner no ha
 * subido foto de portada a su ficha.
 */
export function coverArtFromString(value: string): { from: string; to: string; angle: number } {
  const hue = hueFromString(value)
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}
