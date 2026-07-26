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
    respondToDisputeError.value = "La réponse n'a pas pu être envoyée. Réessayez."
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
    confirmDisputeResolutionError.value = "Votre confirmation n'a pas pu être envoyée. Réessayez."
  } finally {
    isConfirmingDisputeResolution.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-[13px] text-dark">
      Litige ouvert : les fonds restent gelés en séquestre en attendant l'arbitrage de l'équipe de médiation
      WorkTogo.
    </p>
    <p v-if="escrowOrder.disputeEvidence" class="mt-1 text-[12px] text-muted">
      Preuves fournies : {{ escrowOrder.disputeEvidence }}
    </p>

    <p v-if="escrowOrder.disputeResponse" class="mt-2 text-[13px] text-dark">
      Réponse du prestataire : {{ escrowOrder.disputeResponse }}
    </p>
    <p v-else-if="isViewerClient" class="mt-1 text-[12px] text-muted">
      En attente de la réponse du prestataire.
    </p>

    <div v-if="isViewerClient && escrowOrder.disputeResponse" class="mt-3 space-y-2 border-t border-hairline pt-3">
      <p class="text-[12.5px] font-semibold text-dark">Le prestataire indique que la prestation est terminée</p>
      <p class="text-[12px] text-muted">Confirmez-vous que le travail a bien été réalisé ?</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingDisputeResolution"
          @click="handleConfirmDisputeResolution(true)"
        >
          Oui, c'est fait
        </button>
        <button
          type="button"
          class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingDisputeResolution"
          @click="handleConfirmDisputeResolution(false)"
        >
          Non, ce n'est pas fait
        </button>
      </div>
      <p v-if="confirmDisputeResolutionError" class="text-[12.5px] text-error">{{ confirmDisputeResolutionError }}</p>
    </div>

    <div v-if="isViewerProvider && !escrowOrder.disputeResponse" class="mt-3 space-y-2 border-t border-hairline pt-3">
      <p class="text-[12.5px] font-semibold text-dark">Répondre au litige (en médiation)</p>
      <textarea
        v-model="disputeResponseDraft"
        rows="2"
        placeholder="Votre version des faits, en réponse au litige (obligatoire)"
        aria-label="Réponse au litige"
        class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
      />
      <button
        type="button"
        class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!disputeResponseDraft.trim() || isRespondingToDispute"
        @click="handleRespondToDispute"
      >
        {{ isRespondingToDispute ? 'Envoi…' : 'Envoyer ma réponse' }}
      </button>
      <p v-if="respondToDisputeError" class="text-[12.5px] text-error">{{ respondToDisputeError }}</p>
    </div>
  </div>
</template>
