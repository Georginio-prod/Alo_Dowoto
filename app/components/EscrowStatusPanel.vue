<script setup lang="ts">
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

// Valeur d'affichage seulement, dupliquée depuis CLIENT_LATE_CANCELLATION_PENALTY_RATE
// (server/utils/escrowClientCancellation.ts, #275) : les imports app/ → server/utils
// se limitent aux types (voir tous les autres composants de ce dossier), pas
// aux valeurs, pour ne pas embarquer de code serveur (node:crypto, etc.)
// dans le bundle client.
const CLIENT_LATE_CANCELLATION_PENALTY_DISPLAY_PERCENT = 20

/**
 * Bandeau de statut du séquestre affiché au-dessus du fil de discussion une
 * fois le paiement confirmé (#195, epic #191) : bouton « Marquer comme
 * terminé » côté prestataire, « Confirmer la réception » côté chercheur,
 * ou message d'attente/de libération selon l'état.
 */
const props = defineProps<{
  escrowOrder: EscrowOrder
  conversationId: string
  isViewerClient: boolean
  isViewerProvider: boolean
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n({ useScope: 'global' })

const isDelivering = ref(false)
const deliverError = ref('')

async function handleMarkDelivered() {
  if (isDelivering.value) return
  isDelivering.value = true
  deliverError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/deliver`, { method: 'POST' })
    emit('changed')
  } catch {
    deliverError.value = t('escrowStatusPanel.errorActionFailed')
  } finally {
    isDelivering.value = false
  }
}

const isConfirmingReceipt = ref(false)
const receiptError = ref('')

async function handleConfirmReceipt() {
  if (isConfirmingReceipt.value) return
  isConfirmingReceipt.value = true
  receiptError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/receive`, { method: 'POST' })
    emit('changed')
  } catch {
    receiptError.value = t('escrowStatusPanel.errorActionFailed')
  } finally {
    isConfirmingReceipt.value = false
  }
}

// Annulation prestataire et remboursement automatique (#196, epic #191) :
// autorisée tant que les fonds ne sont pas encore libérés (in_escrow ou
// delivered), motif obligatoire à des fins de modération.
const canCancel = computed(
  () => props.isViewerProvider && (props.escrowOrder.status === 'in_escrow' || props.escrowOrder.status === 'delivered'),
)
const showCancelForm = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)
const cancelError = ref('')

async function handleCancelOrder() {
  if (isCancelling.value || !cancelReason.value.trim()) return
  isCancelling.value = true
  cancelError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/cancel`, {
      method: 'POST',
      body: { reason: cancelReason.value.trim() },
    })
    showCancelForm.value = false
    emit('changed')
  } catch {
    cancelError.value = t('escrowStatusPanel.errorCancelFailed')
  } finally {
    isCancelling.value = false
  }
}

// Annulation chercheur et indemnisation possible du prestataire (#275,
// grille d'annulation symétrique — pendant du bloc ci-dessus côté
// prestataire). Autorisée uniquement en séquestre (in_escrow) : une fois
// `delivered`, le désaccord relève du litige, pas de l'annulation — déjà
// garanti par le `v-else-if` du template qui englobe ce bouton.
const showClientCancelForm = ref(false)
const clientCancelReason = ref('')
const isClientCancelling = ref(false)
const clientCancelError = ref('')

async function handleClientCancelOrder() {
  if (isClientCancelling.value || !clientCancelReason.value.trim()) return
  isClientCancelling.value = true
  clientCancelError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/client-cancel`, {
      method: 'POST',
      body: { reason: clientCancelReason.value.trim() },
    })
    showClientCancelForm.value = false
    emit('changed')
  } catch {
    clientCancelError.value = t('escrowStatusPanel.errorCancelFailed')
  } finally {
    isClientCancelling.value = false
  }
}

// Litige (#197/#274, epic #191) : le chercheur conteste la qualité de la
// prestation au lieu de confirmer la réception, avec des preuves à l'appui
// (#274), gèle les fonds en attendant une équipe de médiation WorkTogo.
// Formulaire possédé par DisputeForm.vue (comme EscrowStatusPanel.vue pour
// le séquestre) ; l'affichage/réponse une fois `disputed` est possédé par
// DisputeMediationPanel.vue — cette bascule reste ici, à côté du bouton
// "Confirmer la réception" qu'elle jouxte dans le template.
const showDisputeForm = ref(false)
</script>

<template>
  <div class="mb-3 shrink-0 rounded-card border border-hairline bg-surface p-4">
    <p v-if="escrowOrder.status === 'in_escrow' && isViewerProvider" class="text-[13px] text-dark">
      {{ t('escrowStatusPanel.providerInEscrowText', { amount: escrowOrder.amount.toLocaleString('fr-FR') }) }}
    </p>
    <p v-if="escrowOrder.status === 'in_escrow' && isViewerProvider" class="mt-1 text-[12px] text-muted">
      {{ t('escrowStatusPanel.providerGuaranteeNote') }}
    </p>

    <InterventionProofPanel
      v-if="escrowOrder.status === 'in_escrow' && isViewerProvider"
      :escrow-order="escrowOrder"
      :conversation-id="conversationId"
      class="mt-2"
      @changed="emit('changed')"
    />

    <button
      v-if="escrowOrder.status === 'in_escrow' && isViewerProvider"
      type="button"
      class="press mt-2 rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isDelivering || escrowOrder.checkOutAt === null"
      @click="handleMarkDelivered"
    >
      {{ isDelivering ? t('escrowStatusPanel.delivering') : t('escrowStatusPanel.markDeliveredCta') }}
    </button>

    <ReschedulePrompt
      v-if="escrowOrder.status === 'in_escrow' && isViewerProvider"
      :conversation-id="conversationId"
      @changed="emit('changed')"
    />

    <template v-else-if="escrowOrder.status === 'in_escrow' && isViewerClient">
      <p class="text-[13px] text-muted">
        {{ t('escrowStatusPanel.clientInEscrowText', { amount: escrowOrder.amount.toLocaleString('fr-FR') }) }}
      </p>

      <div class="mt-3 border-t border-hairline pt-3">
        <button
          v-if="!showClientCancelForm"
          type="button"
          class="press text-[12.5px] font-semibold text-error underline"
          @click="showClientCancelForm = true"
        >
          {{ t('escrowStatusPanel.cancelOrderCta') }}
        </button>

        <div v-else class="space-y-2">
          <p class="text-[12px] text-muted">
            {{ t('escrowStatusPanel.clientCancelPolicyText', { percent: CLIENT_LATE_CANCELLATION_PENALTY_DISPLAY_PERCENT }) }}
          </p>
          <textarea
            v-model="clientCancelReason"
            rows="2"
            :placeholder="t('escrowStatusPanel.cancelReasonPlaceholder')"
            :aria-label="t('escrowStatusPanel.cancelReasonAria')"
            class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
          />
          <div class="flex gap-2">
            <button
              type="button"
              class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="!clientCancelReason.trim() || isClientCancelling"
              @click="handleClientCancelOrder"
            >
              {{ isClientCancelling ? t('escrowStatusPanel.cancelling') : t('escrowStatusPanel.confirmCancelCta') }}
            </button>
            <button type="button" class="press text-[12.5px] text-muted" @click="showClientCancelForm = false">
              {{ t('escrowStatusPanel.back') }}
            </button>
          </div>
          <p v-if="clientCancelError" class="text-[12.5px] text-error">{{ clientCancelError }}</p>
        </div>
      </div>
    </template>

    <template v-else-if="escrowOrder.status === 'delivered' && isViewerClient">
      <p class="text-[13px] text-dark">
        {{ t('escrowStatusPanel.deliveredClientText') }}
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingReceipt"
          @click="handleConfirmReceipt"
        >
          {{ isConfirmingReceipt ? t('escrowStatusPanel.confirming') : t('escrowStatusPanel.confirmReceiptCta') }}
        </button>
        <button
          v-if="!showDisputeForm"
          type="button"
          class="press rounded-field border border-error px-4 py-2 text-[13px] font-semibold text-error"
          @click="showDisputeForm = true"
        >
          {{ t('escrowStatusPanel.disputeCta') }}
        </button>
      </div>

      <DisputeForm
        v-if="showDisputeForm"
        :conversation-id="conversationId"
        @submitted="showDisputeForm = false; emit('changed')"
        @cancel="showDisputeForm = false"
      />
    </template>

    <p v-else-if="escrowOrder.status === 'delivered' && isViewerProvider" class="text-[13px] text-muted">
      {{ t('escrowStatusPanel.deliveredProviderText') }}
    </p>

    <p v-else-if="escrowOrder.status === 'released'" class="text-[13px] text-dark">
      {{ isViewerProvider ? t('escrowStatusPanel.releasedTextProvider') : t('escrowStatusPanel.releasedTextClient') }}
    </p>

    <p v-else-if="escrowOrder.status === 'refunded'" class="text-[13px] text-dark">
      {{ t('escrowStatusPanel.refundedText', { reasonSuffix: escrowOrder.cancelReason ? ` (${escrowOrder.cancelReason})` : '' }) }}
    </p>

    <DisputeMediationPanel
      v-else-if="escrowOrder.status === 'disputed'"
      :escrow-order="escrowOrder"
      :conversation-id="conversationId"
      :is-viewer-client="isViewerClient"
      :is-viewer-provider="isViewerProvider"
      @changed="emit('changed')"
    />

    <p v-if="deliverError" class="mt-2 text-[12.5px] text-error">{{ deliverError }}</p>
    <p v-if="receiptError" class="mt-2 text-[12.5px] text-error">{{ receiptError }}</p>

    <div v-if="canCancel" class="mt-3 border-t border-hairline pt-3">
      <button
        v-if="!showCancelForm"
        type="button"
        class="press text-[12.5px] font-semibold text-error underline"
        @click="showCancelForm = true"
      >
        {{ t('escrowStatusPanel.cancelOrderCta') }}
      </button>

      <div v-else class="space-y-2">
        <textarea
          v-model="cancelReason"
          rows="2"
          :placeholder="t('escrowStatusPanel.cancelReasonPlaceholder')"
          :aria-label="t('escrowStatusPanel.cancelReasonAria')"
          class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
        />
        <div class="flex gap-2">
          <button
            type="button"
            class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!cancelReason.trim() || isCancelling"
            @click="handleCancelOrder"
          >
            {{ isCancelling ? t('escrowStatusPanel.cancelling') : t('escrowStatusPanel.confirmCancelAndRefundCta') }}
          </button>
          <button type="button" class="press text-[12.5px] text-muted" @click="showCancelForm = false">
            {{ t('escrowStatusPanel.back') }}
          </button>
        </div>
        <p v-if="cancelError" class="text-[12.5px] text-error">{{ cancelError }}</p>
      </div>
    </div>
  </div>
</template>
