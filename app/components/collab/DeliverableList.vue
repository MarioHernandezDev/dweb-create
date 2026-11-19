<script setup lang="ts">
import type { Post } from '~/types'
import type { CollabDeliverable, DecisionMode } from '~/composables/useCollabDeliverables'

/**
 * Entregables de una colaboración (los huecos del paquete aceptado, o los que definió la marca y
 * confirmó el creador): cada uno con su publicación, versión, estado derivado por la base de datos,
 * fechas, comentarios de revisión y decisiones de la marca. Las acciones llaman a RPC
 * (`useCollabDeliverables`); aquí no se decide ninguna regla — el servidor es quien la hace cumplir
 * y su mensaje de error se muestra tal cual. Aspecto en patterns/collab-detail.css (.deliv*).
 */
const props = defineProps<{
  role: 'creator' | 'partner'
  collaborationId: string
  counterpartName: string
  deliverables: CollabDeliverable[]
  /** Publicaciones del creador (para asignar y para previsualizar). */
  posts: Post[]
  active: boolean
  myProfileId: string | null
  expandedPostId: string | null
  checklist: { id: string; text: string; done: boolean }[]
}>()
const emit = defineEmits<{ togglePost: [postId: string]; changed: [] }>()

const { acting, assign, unassign, resolve, reopen, confirm: confirmDeliverables } = useCollabDeliverables()
const isPartner = computed(() => props.role === 'partner')

const stateLabel: Record<CollabDeliverable['state'], string> = {
  open: 'Pendiente',
  in_progress: 'En preparación',
  in_review: 'En revisión',
  changes_requested: 'Cambios pedidos',
  approved: 'Aprobado',
  accepted_without_approval: 'Aceptado sin aprobación',
  waived: 'Renunciado'
}

const enforceable = computed(() => props.deliverables.filter((d) => d.enforceable))
const unconfirmed = computed(() => props.deliverables.filter((d) => !d.enforceable))
const done = computed(() => enforceable.value.filter((d) => d.resolved).length)

const postById = (id: string | null) => (id ? props.posts.find((p) => p.id === id) ?? null : null)
const expandedPost = computed(() => props.posts.find((p) => p.id === props.expandedPostId) ?? null)
const who = (id: string | null) => (!id ? 'Alguien' : id === props.myProfileId ? 'Tú' : props.counterpartName)

// Posts que el creador puede asignar: suyos, sin colaboración o de esta, y que no ocupan ya un hueco.
const occupied = computed(() => new Set(props.deliverables.map((d) => d.postId).filter(Boolean) as string[]))
const assignable = computed(() => props.posts.filter((p) => !occupied.value.has(p.id) && (!p.collaborationId || p.collaborationId === props.collaborationId)))
const chosen = ref<Record<string, string>>({})

const error = ref('')
async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
    emit('changed')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se ha podido completar la acción. Inténtalo de nuevo.'
  }
}

const doAssign = (d: CollabDeliverable) => chosen.value[d.id] && run(() => assign(d, chosen.value[d.id]!))
const doUnassign = (d: CollabDeliverable) => run(() => unassign(d))
const doConfirm = () => run(() => confirmDeliverables(props.collaborationId))

// Decisiones de la marca
const dialogOpen = ref(false)
const dialogMode = ref<DecisionMode>('waived')
const dialogTarget = ref<CollabDeliverable | null>(null)
const dialogError = ref('')
function openDecision(d: CollabDeliverable, mode: DecisionMode) {
  dialogTarget.value = d
  dialogMode.value = mode
  dialogError.value = ''
  dialogOpen.value = true
}
async function submitDecision(reason: string) {
  const d = dialogTarget.value
  if (!d) return
  dialogError.value = ''
  try {
    if (dialogMode.value === 'reopen') await reopen(d, reason)
    else await resolve(d, dialogMode.value, reason)
    dialogOpen.value = false
    emit('changed')
  } catch (e) {
    dialogError.value = e instanceof Error ? e.message : 'No se ha podido guardar la decisión.'
  }
}

const canAccept = (d: CollabDeliverable) => !!d.postId && ['ready_for_review', 'scheduled', 'published'].includes(d.postStatus ?? '') && !d.resolved
const hasDecision = (d: CollabDeliverable) => d.decisionKind === 'waived' || d.decisionKind === 'accepted_without_approval'
const dueLabel = (d: CollabDeliverable) => {
  if (!d.dueDate || ['scheduled', 'published'].includes(d.postStatus ?? '')) return null
  const days = Math.round((new Date(d.dueDate).getTime() - Date.now()) / 86_400_000)
  return days < 0 ? { text: `Atrasada ${Math.abs(days)} d`, late: true } : { text: days === 0 ? 'Vence hoy' : `Vence en ${days} d`, late: false }
}
</script>

<template>
  <div class="delist" data-deliverables>
    <div v-if="enforceable.length" class="delist__progress" data-deliverables-progress>
      <p class="delist__count"><strong>{{ done }} de {{ enforceable.length }}</strong> resueltos</p>
      <span class="delist__bar"><span class="delist__bar-fill" :style="{ width: `${(done / enforceable.length) * 100}%` }" /></span>
    </div>

    <div v-if="unconfirmed.length" class="delist__notice" data-deliverables-unconfirmed>
      <template v-if="!isPartner">
        <p><strong>{{ counterpartName }} ha definido {{ unconfirmed.length }} entregable{{ unconfirmed.length === 1 ? '' : 's' }}.</strong> Hasta que los confirmes no son exigibles para completar la colaboración.</p>
        <BaseButton v-if="active" variant="primary" size="sm" :loading="acting === `confirm:${collaborationId}`" data-confirm-deliverables @click="doConfirm">Confirmar entregables</BaseButton>
      </template>
      <p v-else>Pendientes de confirmar por {{ counterpartName }}: hasta entonces no son exigibles.</p>
    </div>

    <p v-if="error" class="collab-error" role="alert" data-deliverables-error>{{ error }}</p>

    <ul class="deliv">
      <li v-for="d in deliverables" :key="d.id" class="deliv__item" :data-state="d.state" :data-confirmed="d.enforceable" data-deliverable>
        <div class="deliv__head">
          <span class="deliv__index" aria-hidden="true">{{ d.position + 1 }}</span>
          <div class="deliv__main">
            <p class="deliv__title">{{ d.title }}</p>
            <p class="deliv__meta">
              <span class="deliv__state" :data-state="d.state">{{ d.enforceable ? stateLabel[d.state] : 'Por confirmar' }}</span>
              <template v-if="d.postId">
                <span class="deliv__post">«{{ d.postTitle }}»</span>
                <span v-if="d.contentVersion" class="deliv__version">v{{ d.contentVersion }}</span>
              </template>
              <span v-if="dueLabel(d)" class="deliv__due" :data-late="dueLabel(d)!.late">{{ dueLabel(d)!.text }}</span>
              <span v-if="d.approvalInvalidated" class="deliv__flag" data-flag="invalidated">Aprobación invalidada</span>
              <span v-if="d.editedAfterPublish" class="deliv__flag">Editada tras publicar</span>
              <span v-if="d.approvalMissing" class="deliv__flag">Sin aprobación</span>
              <span v-if="d.decisionOutdated" class="deliv__flag">Decisión caducada</span>
            </p>
            <p v-if="hasDecision(d) && (d.resolved || d.decisionOutdated)" class="deliv__decision" data-decision>
              {{ d.decisionKind === 'waived' ? 'Renunciado' : 'Aceptado sin aprobación' }} por {{ who(d.decidedBy) }}: {{ d.decisionReason }}
            </p>
            <p v-if="d.state === 'changes_requested' && d.lastReviewComment" class="deliv__quote">{{ d.lastReviewComment }}</p>
          </div>
        </div>

        <div v-if="d.enforceable && active" class="deliv__actions">
          <!-- Creador: asignar una publicación al hueco libre -->
          <template v-if="!isPartner && d.state === 'open'">
            <label class="sr-only" :for="`assign-${d.id}`">Publicación para {{ d.title }}</label>
            <select :id="`assign-${d.id}`" v-model="chosen[d.id]" class="select deliv__select" data-assign-select>
              <option :value="undefined" disabled>{{ assignable.length ? 'Elige una publicación…' : 'No tienes publicaciones libres' }}</option>
              <option v-for="p in assignable" :key="p.id" :value="p.id">{{ p.title }}</option>
            </select>
            <BaseButton variant="primary" size="sm" :disabled="!chosen[d.id]" :loading="acting === d.id" data-assign @click="doAssign(d)">Asignar</BaseButton>
            <BaseButton :to="`/creator/timeline?nueva=1&colaboracion=${collaborationId}&entregable=${d.id}`" variant="outline" size="sm">Crear publicación</BaseButton>
          </template>

          <template v-if="d.postId">
            <BaseButton variant="ghost" size="sm" :aria-expanded="expandedPostId === d.postId" @click="emit('togglePost', d.postId!)">
              {{ expandedPostId === d.postId ? 'Ocultar' : 'Ver publicación' }}
            </BaseButton>
            <BaseButton v-if="!isPartner && ['idea', 'in_production'].includes(d.postStatus ?? '') && !d.resolved" variant="ghost" size="sm" :loading="acting === d.id" data-unassign @click="doUnassign(d)">Soltar</BaseButton>
            <BaseButton v-if="!isPartner" :to="`/creator/post/${d.postId}`" variant="ghost" size="sm">Abrir</BaseButton>
          </template>

          <!-- Marca: decisiones con motivo -->
          <template v-if="isPartner">
            <BaseButton v-if="canAccept(d)" variant="outline" size="sm" data-accept-without-approval @click="openDecision(d, 'accepted_without_approval')">Aceptar sin aprobación</BaseButton>
            <BaseButton v-if="!d.resolved" variant="outline" size="sm" data-waive @click="openDecision(d, 'waived')">Renunciar</BaseButton>
            <BaseButton v-if="hasDecision(d) && d.resolved" variant="ghost" size="sm" data-reopen @click="openDecision(d, 'reopen')">Reabrir</BaseButton>
          </template>
        </div>

        <CollabPostPreview v-if="d.postId && expandedPost?.id === d.postId" :post="expandedPost" :checklist="checklist">
          <PostReviewActions
            v-if="isPartner && expandedPost.status === 'ready_for_review'" class="post-preview__actions"
            :post-id="expandedPost.id" :content-version="expandedPost.contentVersion" @done="emit('changed')"
          />
        </CollabPostPreview>
      </li>
    </ul>

    <DeliverableDecisionDialog
      v-model="dialogOpen" :mode="dialogMode" :deliverable-title="dialogTarget?.title ?? ''" :post-title="dialogTarget?.postTitle"
      :loading="!!dialogTarget && acting === dialogTarget.id" :error="dialogError" @submit="submitDecision"
    />
  </div>
</template>
