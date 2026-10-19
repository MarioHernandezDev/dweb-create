<script setup lang="ts">
import { initialsFromName, hueFromString } from '~/utils/avatar'

useHead({ title: 'Perfil' })

const { brandClient } = useMyBrandClient()
const { collaborations, ensureLoaded } = useMyCollaborations()
await ensureLoaded()

const primaryCollaboration = computed(() => collaborations.value[0] ?? null)

const user = useSupabaseUser()
const { logout } = useLogout()
</script>

<template>
  <AppShell role="client" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar v-if="brandClient" :initials="initialsFromName(brandClient.name)" :hue="hueFromString(brandClient.name)" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ brandClient?.name }}</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Cuenta de marca' }}</p>
        </div>
      </section>

      <section class="mb-6">
        <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
          <div v-if="primaryCollaboration?.influencerName" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Colaboración activa</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ primaryCollaboration.influencerName }}</span>
          </div>
          <div v-if="primaryCollaboration?.managerName" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Gestionado por</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ primaryCollaboration.managerName }}</span>
          </div>
          <div v-if="!primaryCollaboration" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Colaboración activa</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">Ninguna todavía</span>
          </div>
          <NuxtLink to="/client/discover" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Descubrir más talento</span>
            <Icon name="ph:caret-right-bold" class="size-4 text-[var(--color-text-faint)]" />
          </NuxtLink>
        </BaseCard>
      </section>

      <BaseButton variant="secondary" icon="ph:sign-out-bold" class="w-full" @click="logout">Cerrar sesión</BaseButton>
    </div>
  </AppShell>
</template>
