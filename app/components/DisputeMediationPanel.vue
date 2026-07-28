<script setup lang="ts">
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Affichage et réponse à un litige ouvert (#197/#274, statut `disputed`) —
 * extrait de EscrowStatusPanel.vue pour rester sous la limite de lignes par
 * fichier. La réponse du prestataire ne change pas le statut de la
 * commande (les fonds restent gelés) ; elle marque le passage effectif en
 * médiation pour l'équipe support.
 */
const props = defineProps<{
  escrowOrder: EscrowOrder
  conversationId: string
  isViewerClient: boolean
  isViewerProvider: boolean
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n({ useScope: 'global' })

const disputeResponseDraft = ref('')
const isRespondingToDispute = ref(false)
const respondToDisputeError = ref('')

async function handleRespondToDispute() {
  if (isRespondingToDispute.value || !disputeResponseDraft.value.trim()) return
  isRespondingToDispute.value = true
  respondToDisputeError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/respond-dispute`, {
      method: 'POST',
      body: { response: disputeResponseDraft.value.trim() },
    })
    disputeResponseDraft.value = ''
    emit('changed')
  } catch {
    respondToDisputeError.value = t('disputeMediationPanel.errorResponseFailed')
  } finally {
    isRespondingToDispute.value = false
  }
}

const isConfirmingDisputeResolution = ref(false)
const confirmDisputeResolutionError = ref('')

async function handleConfirmDisputeResolution(confirmed: boolean) {
  if (isConfirmingDisputeResolution.value) return
  isConfirmingDisputeResolution.value = true
  confirmDisputeResolutionError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/confirm-dispute-resolution`, {
      method: 'POST',
      body: { confirmed },
    })
    emit('changed')
  } catch {
    confirmDisputeResolutionError.value = t('disputeMediationPanel.errorConfirmFailed')
  } finally {
    isConfirmingDisputeResolution.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-[13px] text-dark">
      {{ t('disputeMediationPanel.frozenText') }}
    </p>
    <p v-if="escrowOrder.disputeEvidence" class="mt-1 text-[12px] text-muted">
      {{ t('disputeMediationPanel.evidenceProvidedText', { evidence: escrowOrder.disputeEvidence }) }}
    </p>

    <p v-if="escrowOrder.disputeResponse" class="mt-2 text-[13px] text-dark">
      {{ t('disputeMediationPanel.providerResponseText', { response: escrowOrder.disputeResponse }) }}
    </p>
    <p v-else-if="isViewerClient" class="mt-1 text-[12px] text-muted">
      {{ t('disputeMediationPanel.awaitingResponseText') }}
    </p>

    <div v-if="isViewerClient && escrowOrder.disputeResponse" class="mt-3 space-y-2 border-t border-hairline pt-3">
      <p class="text-[12.5px] font-semibold text-dark">{{ t('disputeMediationPanel.providerDoneHeading') }}</p>
      <p class="text-[12px] text-muted">{{ t('disputeMediationPanel.confirmQuestion') }}</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingDisputeResolution"
          @click="handleConfirmDisputeResolution(true)"
        >
          {{ t('disputeMediationPanel.confirmYes') }}
        </button>
        <button
          type="button"
          class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingDisputeResolution"
          @click="handleConfirmDisputeResolution(false)"
        >
          {{ t('disputeMediationPanel.confirmNo') }}
        </button>
      </div>
      <p v-if="confirmDisputeResolutionError" class="text-[12.5px] text-error">{{ confirmDisputeResolutionError }}</p>
    </div>

    <div v-if="isViewerProvider && !escrowOrder.disputeResponse" class="mt-3 space-y-2 border-t border-hairline pt-3">
      <p class="text-[12.5px] font-semibold text-dark">{{ t('disputeMediationPanel.respondHeading') }}</p>
      <textarea
        v-model="disputeResponseDraft"
        rows="2"
        :placeholder="t('disputeMediationPanel.responsePlaceholder')"
        :aria-label="t('disputeMediationPanel.responseAria')"
        class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
      />
      <button
        type="button"
        class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!disputeResponseDraft.trim() || isRespondingToDispute"
        @click="handleRespondToDispute"
      >
        {{ isRespondingToDispute ? t('disputeMediationPanel.sending') : t('disputeMediationPanel.sendResponseCta') }}
      </button>
      <p v-if="respondToDisputeError" class="text-[12.5px] text-error">{{ respondToDisputeError }}</p>
    </div>
  </div>
</template>
