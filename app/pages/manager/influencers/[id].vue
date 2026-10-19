<script setup lang="ts">
import { platformMeta, formatCompactNumber } from '~/utils/mock-data'
import { initialsFromName, hueFromString } from '~/utils/avatar'
import type { ContentType, Influencer, Platform, Post, PostStatus, SocialAccount } from '~/types'

interface InfluencerRow { id: string; display_name: string; niche: string | null }
interface PostRow {
  id: string; influencer_id: string; title: string; caption: string | null
  content_type: ContentType; platform: Platform; status: PostStatus; due_date: string
  metadata: { hashtags?: string[] } | null
}
interface SocialAccountRow { id: string; platform: SocialAccount['platform']; handle: string | null; followers_count: number }

function coverFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return { from: `hsl(${hue} 78% 54%)`, to: `hsl(${(hue + 36) % 360} 70% 40%)`, angle: 135 }
}

function mapPostRow(row: PostRow): Post {
  const dueInDays = Math.round((new Date(row.due_date).getTime() - Date.now()) / 86_400_000)
  return {
    id: row.id,
    influencerId: row.influencer_id,
    title: row.title,
    caption: row.caption ?? '',
    contentType: row.content_type,
    platform: row.platform,
    status: row.status,
    dueInDays,
    hashtags: row.metadata?.hashtags ?? [],
    cover: coverFromId(row.id)
  }
}

const route = useRoute()
const client = useSupabaseClient()
const influencerId = route.params.id as string

const { data: influencerRow } = await client
  .from('influencers')
  .select('id, display_name, niche')
  .eq('id', influencerId)
  .maybeSingle<InfluencerRow>()

if (!influencerRow) {
  throw createError({ statusCode: 404, statusMessage: 'Influencer no encontrado' })
}

const influencer: Influencer = {
  id: influencerRow.id,
  name: influencerRow.display_name,
  niche: influencerRow.niche ?? 'Sin especificar',
  initials: initialsFromName(influencerRow.display_name),
  hue: hueFromString(influencerRow.display_name),
  // El nº de seguidores real llega con la sincronización de redes (Fase 4);
  // hasta entonces, 0 es honesto — no inventamos una cifra (ver discover.vue).
  weeklyTarget: 0,
  followers: 0,
  managerId: null
}

useHead({ title: influencer.name })

const [{ data: postRows, error: postError }, { data: accountRows, error: accountError }] = await Promise.all([
  client.from('posts').select('*').eq('influencer_id', influencerId).order('due_date', { ascending: true }),
  client.from('social_accounts').select('id, platform, handle, followers_count').eq('influencer_id', influencerId)
])
if (postError) console.error('[manager/influencers/:id] fallo al cargar las entregas:', postError.message)
if (accountError) console.error('[manager/influencers/:id] fallo al cargar las redes:', accountError.message)

const posts = ref<Post[]>(((postRows as PostRow[]) ?? []).map(mapPostRow))
// Solo existe fila en `social_accounts` para una red ya conectada (ver
// useMySocialAccounts) — todo lo que llega aquí está, por definición, conectado.
const connectedAccounts = ref<SocialAccount[]>(
  ((accountRows as SocialAccountRow[]) ?? []).map((r) => ({
    id: r.id, platform: r.platform, handle: r.handle ?? '', followers: r.followers_count, deltaPct: 0, connected: true
  }))
)

const pending = computed(() => posts.value.filter((p) => p.status !== 'published').length)
const overdue = computed(() => posts.value.filter((p) => p.status === 'overdue').length)
const published = computed(() => posts.value.filter((p) => p.status === 'published').length)

const detailOpen = ref(false)
const detailPost = ref<Post | null>(null)
function openDetail(post: Post) {
  detailPost.value = post
  detailOpen.value = true
}
</script>

<template>
  <AppShell v-if="influencer" role="manager" :title="influencer.name" :subtitle="influencer.niche">
    <section class="flex items-center gap-4 mb-7">
      <BaseAvatar :initials="influencer.initials" :hue="influencer.hue" size="lg" />
      <div>
        <p class="font-display text-[1.375rem] text-[var(--color-text)]">{{ influencer.name }}</p>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ influencer.niche }} · {{ formatCompactNumber(influencer.followers) }} seguidores</p>
      </div>
    </section>

    <section class="grid grid-cols-3 gap-3 mb-8">
      <StatTile label="Por cerrar" :value="String(pending)" />
      <StatTile label="Fuera de plazo" :value="String(overdue)" />
      <StatTile label="Publicadas" :value="String(published)" />
    </section>

    <section class="mb-8">
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Cuentas conectadas</h2>
      <div class="flex flex-wrap gap-2.5">
        <span
          v-for="acc in connectedAccounts" :key="acc.id"
          class="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full bg-[var(--color-ink-overlay)] border border-[var(--color-hairline)] text-[0.8125rem] text-[var(--color-text-muted)]"
        >
          <Icon :name="platformMeta[acc.platform].icon" class="size-4" :style="{ color: platformMeta[acc.platform].colorVar }" />
          {{ acc.handle || platformMeta[acc.platform].label }}
        </span>
      </div>
    </section>

    <section>
      <h2 class="font-display text-[1.125rem] text-[var(--color-text)] mb-3.5">Entregas</h2>
      <WeekBoard :posts="posts" @open="openDetail" />
    </section>
    <PostDetailSheet v-model="detailOpen" :post="detailPost" :influencer="influencer" />
  </AppShell>
</template>
