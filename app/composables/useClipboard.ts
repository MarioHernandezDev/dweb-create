/**
 * Copiar texto al portapapeles con feedback — usado para "compartir enlace
 * de perfil" (perfil público de otro usuario y el tuyo propio desde Tu Perfil).
 * `ref` normal a propósito, no `useState`: cada botón que use este composable
 * necesita su propio "copiado"/"error" independiente, no uno compartido por
 * toda la app.
 */
export function useClipboard() {
  const copied = ref(false)
  const error = ref(false)

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      error.value = false
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (e) {
      console.error('[useClipboard] fallo al copiar:', e)
      error.value = true
    }
  }

  return { copied, error, copy }
}
