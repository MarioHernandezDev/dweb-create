<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Package } from '~/composables/usePackages'

/**
 * Gestión de los paquetes (creador) o necesidades (partner) propios: listado reordenable, alta, edición, pausa,
 * destacado, duplicado y borrado. Lo usan la pestaña del perfil y la página «Paquetes» del menú. Quien lo monta
 * debe haber cargado ya `myPackages` y los contadores de ofertas (`ensureMyPackages`, `refreshPendingCounts`).
 */
const props = defineProps<{ role: 'creator' | 'partner'; profileId: string | null; publicHref?: string | null }>()

const { myPackages, duplicatePackage, updatePackage, reorderPackages, setFeaturedPackage, deletePackage } = usePackages()
const { pendingCountByPackage } = useOffers()
const { confirm } = useConfirm()
const route = useRoute()

const isCreator = computed(() => props.role === 'creator')
const copy = computed(() => isCreator.value
  ? {
      title: 'Tus paquetes',
      description: 'Lo que ofreces: un partner podrá hacer una oferta sobre cualquiera. Arrastra para reordenar.',
      add: 'Añadir paquete',
      emptyTitle: 'Sin paquetes todavía',
      emptyDescription: 'Crea tu primer paquete para que los partners puedan ofertar sobre él.',
      emptyCta: 'Crear mi primer paquete',
      one: 'el paquete', active: ['activo', 'activos']
    }
  : {
      title: 'Tus necesidades',
      description: 'Lo que buscas: un creador podrá hacer una oferta ajustándose a tu necesidad. Arrastra para reordenar.',
      add: 'Añadir necesidad',
      emptyTitle: 'Sin necesidades todavía',
      emptyDescription: 'Publica qué necesitas para que un creador pueda ofertar ajustándose a ello.',
      emptyCta: 'Publicar mi primera necesidad',
      one: 'la necesidad', active: ['activa', 'activas']
    })

const sheetOpen = ref(false)
const editing = ref<Package | null>(null)
const error = ref('')

function openNew() {
  editing.value = null
  sheetOpen.value = true
}
function openEdit(pkg: Package) {
  editing.value = pkg
  sheetOpen.value = true
}
// `?nuevo=1` (desde Inicio, el recorrido o el perfil público) abre directamente el formulario de alta.
onMounted(() => { if (route.query.nuevo === '1') openNew() })

async function run(action: () => Promise<unknown>, failure: string) {
  error.value = ''
  try {
    await action()
  } catch {
    error.value = `No se ha podido ${failure} ${copy.value.one}. Inténtalo de nuevo.`
  }
}

async function confirmDelete(pkg: Package) {
  const ok = await confirm({
    title: `¿Borrar "${pkg.title}"?`,
    message: 'Se borrará permanentemente, junto con cualquier oferta que se haya hecho sobre él.',
    confirmLabel: 'Borrar', tone: 'danger', icon: 'ph:trash-fill'
  })
  if (ok) await run(() => deletePackage(pkg.id), 'borrar')
}
const toggleActive = (pkg: Package) => run(() => updatePackage(pkg.id, { active: !pkg.active }), 'actualizar')
const feature = (pkg: Package) => run(() => setFeaturedPackage(pkg.isFeatured ? null : pkg.id), 'destacar')
const duplicate = (pkg: Package) => run(() => duplicatePackage(pkg), 'duplicar')

const activeCount = computed(() => (myPackages.value ?? []).filter((p) => p.active).length)
const pendingTotal = computed(() => Object.values(pendingCountByPackage.value).reduce((sum, n) => sum + n, 0))
</script>

<template>
  <div>
    <div class="packages-head">
      <div>
        <SectionTitle :title="copy.title" :description="copy.description" />
        <p v-if="myPackages?.length" class="packages-summary" data-packages-summary>
          {{ activeCount }} {{ copy.active[activeCount === 1 ? 0 : 1] }}
          <span v-if="pendingTotal"> · {{ pendingTotal }} oferta{{ pendingTotal > 1 ? 's' : '' }} pendiente{{ pendingTotal > 1 ? 's' : '' }}</span>
        </p>
      </div>
      <BaseButton variant="primary" size="sm" icon="ph:plus-bold" data-add-package @click="openNew">{{ copy.add }}</BaseButton>
    </div>
    <p v-if="myPackages?.length" class="packages-tip" data-packages-tip>
      <Icon name="ph:star-bold" class="size-4 shrink-0" />
      <span>Destaca uno con la estrella: sale primero en tu perfil.</span>
      <NuxtLink v-if="publicHref" :to="publicHref" class="packages-tip__link">Ver cómo te ven {{ isCreator ? 'las marcas' : 'los creadores' }}<Icon name="ph:arrow-up-right-bold" class="size-3.5" /></NuxtLink>
    </p>
    <p v-if="error" class="setting-error mb-3" role="alert">{{ error }}</p>
    <EmptyState v-if="!myPackages?.length" icon="ph:package" mascot="swim" :title="copy.emptyTitle" :description="copy.emptyDescription">
      <BaseButton variant="primary" size="sm" icon="ph:plus-bold" @click="openNew">{{ copy.emptyCta }}</BaseButton>
    </EmptyState>
    <draggable
      v-else v-model="myPackages" item-key="id" :animation="150" :delay="150" :delay-on-touch-only="true"
      class="packages-grid" ghost-class="nx-package-ghost"
      @end="reorderPackages((myPackages ?? []).map((p) => p.id))"
    >
      <template #item="{ element }: { element: Package }">
        <PackageCard
          :pkg="element" editable drag-handle :pending-offers="pendingCountByPackage[element.id]"
          @edit="openEdit" @delete="confirmDelete(element)"
          @toggle-active="toggleActive" @duplicate="duplicate" @feature="feature"
        />
      </template>
    </draggable>
    <PackageFormSheet v-if="profileId" v-model="sheetOpen" :profile-id="profileId" :role="role" :editing="editing" />
  </div>
</template>
