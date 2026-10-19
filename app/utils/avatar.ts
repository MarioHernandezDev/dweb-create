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
