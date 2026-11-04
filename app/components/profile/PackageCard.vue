<script setup lang="ts">
import { formatEuros } from '~/utils/mock-data'
import type { Package } from '~/composables/usePackages'

/**
 * Paquete de un perfil: lo que se ofrece, qué incluye y el precio. En el perfil
 * público lleva «Hacer oferta»; en el propio (`editable`), el interruptor de
 * activo y las acciones de gestión. Aspecto en assets/css/components/package.css.
 */
defineProps<{ pkg: Package; editable?: boolean; pendingOffers?: number; dragHandle?: boolean }>()
defineEmits<{ edit: [pkg: Package]; delete: [pkg: Package]; offer: [pkg: Package]; toggleActive: [pkg: Package]; duplicate: [pkg: Package] }>()
</script>

<template>
  <article class="package" :class="!pkg.active && 'is-paused'">
    <div class="package__top">
      <Icon v-if="dragHandle" name="ph:dots-six-vertical-bold" class="package__grip" />

      <div class="package__cover">
        <CoverArt :seed="pkg.id" icon="ph:package-fill" />
        <SmartImage v-if="pkg.coverUrl" :src="pkg.coverUrl" :width="160" :height="160" class="package__photo" />
      </div>

      <div class="package__text">
        <h3 class="package__title">{{ pkg.title }}</h3>
        <p v-if="pkg.description" class="package__desc">{{ pkg.description }}</p>
      </div>

      <p class="package__price">{{ formatEuros(pkg.priceCents) }}</p>
    </div>

    <ul v-if="pkg.deliverables.length" class="package__items">
      <li v-for="d in pkg.deliverables" :key="d"><Icon name="ph:check-bold" class="size-4" /> {{ d }}</li>
    </ul>

    <div class="package__foot">
      <template v-if="editable">
        <button
          type="button" role="switch" class="switch" :aria-checked="pkg.active"
          :aria-label="pkg.active ? 'Pausar paquete' : 'Activar paquete'"
          @click="$emit('toggleActive', pkg)"
        >
          <span class="switch__thumb" />
        </button>
        <span v-if="pendingOffers" class="package__pending">{{ pendingOffers }} oferta{{ pendingOffers > 1 ? 's' : '' }} pendiente{{ pendingOffers > 1 ? 's' : '' }}</span>
        <span v-else-if="!pkg.active" class="package__state">En pausa</span>
        <span class="package__actions">
          <BaseButton variant="secondary" size="sm" @click="$emit('edit', pkg)">Editar</BaseButton>
          <IconButton icon="ph:copy-bold" label="Duplicar paquete" size="sm" @click="$emit('duplicate', pkg)" />
          <BaseButton variant="destructive" size="sm" @click="$emit('delete', pkg)">Eliminar</BaseButton>
        </span>
      </template>
      <BaseButton v-else variant="primary" size="sm" block @click="$emit('offer', pkg)">Hacer oferta</BaseButton>
    </div>
  </article>
</template>
