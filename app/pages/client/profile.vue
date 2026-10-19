<script setup lang="ts">
import { myBrand, myBrandInfluencerId, influencers, managers } from '~/utils/mock-data'

useHead({ title: 'Perfil' })

const collaborator = influencers.find((i) => i.id === myBrandInfluencerId)!
const collaboratorManager = managers.find((m) => m.id === collaborator.managerId)

const user = useSupabaseUser()
const { logout } = useLogout()
</script>

<template>
  <AppShell role="client" title="Perfil">
    <div class="md:max-w-lg">
      <section class="flex items-center gap-4 mb-8">
        <BaseAvatar :initials="myBrand.initials" :hue="myBrand.hue" size="lg" />
        <div>
          <p class="font-display text-[1.25rem] text-[var(--color-text)]">{{ myBrand.name }}</p>
          <p class="text-[0.9375rem] text-[var(--color-text-muted)]">{{ user?.email ?? 'Cuenta de marca' }}</p>
        </div>
      </section>

      <section class="mb-6">
        <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Colaboración activa</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ collaborator.name }}</span>
          </div>
          <div v-if="collaboratorManager" class="flex items-center justify-between px-5 py-4">
            <span class="text-[0.9375rem] text-[var(--color-text)]">Gestionado por</span>
            <span class="text-[0.8125rem] text-[var(--color-text-faint)]">{{ collaboratorManager.name }}</span>
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
