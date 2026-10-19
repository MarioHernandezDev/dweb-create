<script setup lang="ts">
useHead({ title: 'Perfil' })
</script>

<template>
  <AppShell role="client" title="Perfil">
    <section class="flex items-center gap-4 mb-8">
      <BaseAvatar initials="LS" :hue="300" size="lg" />
      <div>
        <p class="font-display text-[1.25rem] text-[var(--color-text)]">Lúmina Skincare</p>
        <p class="text-[0.9375rem] text-[var(--color-text-muted)]">Cuenta de cliente</p>
      </div>
    </section>

    <section class="mb-6">
      <BaseCard radius="lg" padding="none" class="divide-y divide-[var(--color-hairline)] overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-[0.9375rem] text-[var(--color-text)]">Tema de la app</span>
          <ThemeToggle />
        </div>
        <div class="flex items-center justify-between px-5 py-4">
          <span class="text-[0.9375rem] text-[var(--color-text)]">Gestionado por</span>
          <span class="text-[0.8125rem] text-[var(--color-text-faint)]">Tu agencia</span>
        </div>
      </BaseCard>
    </section>

    <RoleSwitcher current="client" />
  </AppShell>
</template>
