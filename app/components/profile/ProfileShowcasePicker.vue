<script setup lang="ts">
import { platformMeta } from '~/utils/mock-data'
import type { Platform } from '~/types'

/**
 * «Contenido destacado»: el creador elige cuáles de sus publicaciones YA publicadas se enseñan en su perfil público
 * (con sus métricas reales si las tiene). Cada casilla se guarda al momento, como la portada. Máximo 12.
 */
const MAX = 12
interface Row { id: string; title: string; platform: Platform; content_type: string; media_url: string | null; featured_on_profile: boolean }

const client = useSupabaseClient()
const toast = useToast()
const { creator } = useMyCreator()
const rows = ref<Row[]>([])
const loading = ref(true)
const busy = ref<string | null>(null)
const featuredCount = computed(() => rows.value.filter((r) => r.featured_on_profile).length)

onMounted(async () => {
  if (!creator.value) return
  const { data } = await client.from('posts')
    .select('id, title, platform, content_type, media_url, featured_on_profile')
    .eq('creator_id', creator.value.id).eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false }).limit(60)
  rows.value = (data ?? []) as Row[]
  loading.value = false
})

async function toggle(row: Row) {
  if (busy.value) return
  const next = !row.featured_on_profile
  if (next && featuredCount.value >= MAX) { toast.error(`Puedes destacar hasta ${MAX} publicaciones.`); return }
  busy.value = row.id
  const { error } = await client.from('posts').update({ featured_on_profile: next } as never).eq('id', row.id)
  busy.value = null
  if (error) { toast.error('No se ha podido guardar el cambio.'); return }
  row.featured_on_profile = next
}
</script>

<template>
  <section class="showcase" aria-labelledby="showcase-title" data-showcase-picker>
    <h3 id="showcase-title" class="ficha-form__title">Contenido destacado <span class="showcase__count">{{ featuredCount }}/{{ MAX }}</span></h3>
    <p class="field__hint">Elige qué publicaciones tuyas ya publicadas ve quien visite tu perfil. Se guarda al marcar.</p>
    <p v-if="loading" class="field__hint">Cargando tus publicaciones…</p>
    <p v-else-if="!rows.length" class="field__hint" data-showcase-empty>Todavía no tienes publicaciones publicadas. Cuando publiques alguna en Studio, podrás destacarla aquí.</p>
    <ul v-else class="showcase__list">
      <li v-for="r in rows" :key="r.id">
        <label class="showcase__item" :class="r.featured_on_profile && 'is-on'">
          <input type="checkbox" :checked="r.featured_on_profile" :disabled="busy === r.id" @change="toggle(r)">
          <span class="showcase__thumb"><SmartImage v-if="r.media_url" :src="r.media_url" :width="96" :height="96" /><Icon v-else :name="platformMeta[r.platform].icon" class="size-5" /></span>
          <span class="showcase__text"><strong>{{ r.title }}</strong><small>{{ platformMeta[r.platform].label }}</small></span>
          <Icon :name="r.featured_on_profile ? 'ph:star-fill' : 'ph:star'" class="size-5 showcase__star" />
        </label>
      </li>
    </ul>
  </section>
</template>
