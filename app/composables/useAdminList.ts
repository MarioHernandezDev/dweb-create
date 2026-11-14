/**
 * Listado paginado del panel de admin con filtros que viajan en la URL (para pasar un enlace a un compañero).
 * `prefix` evita choques entre pestañas (`u_` usuarios, `a_` actividad, `r_` reportes). Un cambio de filtro
 * vuelve a la página 1; el texto se espera 300 ms antes de buscar.
 */
export function useAdminList<T>(opts: { endpoint: string; prefix: string; defaults: Record<string, string>; dataKey: string; pageSize?: number }) {
  const route = useRoute()
  const router = useRouter()
  const pageSize = opts.pageSize ?? 25

  const fromUrl = (key: string, fallback: string) => {
    const v = route.query[opts.prefix + key]
    return typeof v === 'string' ? v : fallback
  }
  const filters = reactive<Record<string, string>>(Object.fromEntries(Object.entries(opts.defaults).map(([k, d]) => [k, fromUrl(k, d)])))
  const page = ref(Math.max(1, Number(fromUrl('page', '1')) || 1))
  const items = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')

  function syncUrl() {
    const query: Record<string, string | undefined> = { ...(route.query as Record<string, string>) }
    for (const [k, d] of Object.entries(opts.defaults)) query[opts.prefix + k] = filters[k] && filters[k] !== d ? filters[k] : undefined
    query[opts.prefix + 'page'] = page.value > 1 ? String(page.value) : undefined
    router.replace({ query })
  }

  let seq = 0
  async function load() {
    const mine = ++seq
    loading.value = true
    error.value = ''
    try {
      const params: Record<string, string | number> = { page: page.value, pageSize }
      for (const [k, v] of Object.entries(filters)) if (v) params[k] = v
      const res = await $fetch<Record<string, unknown> & { total: number }>(opts.endpoint, { query: params })
      if (mine !== seq) return
      items.value = (res[opts.dataKey] ?? []) as T[]
      total.value = res.total
    } catch (e) {
      if (mine !== seq) return
      if ((e as { statusCode?: number })?.statusCode === 401) { await navigateTo('/admin/login'); return }
      error.value = errorText(e, 'No se han podido cargar los datos.')
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  watch(filters, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { page.value = 1; syncUrl(); load() }, 300)
  })
  function setPage(p: number) {
    page.value = p
    syncUrl()
    load()
  }
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  return { filters, page, pageSize, items, total, loading, error, load, setPage }
}
