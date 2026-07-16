<script setup lang="ts">
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

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
    deliverError.value = "Cette action n'a pas pu être effectuée. Réessayez."
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
    receiptError.value = "Cette action n'a pas pu être effectuée. Réessayez."
  } finally {
    isConfirmingReceipt.value = false
  }
}
</script>

<template>
  <div class="mb-3 shrink-0 rounded-card border border-hairline bg-surface p-4">
    <p v-if="escrowOrder.status === 'in_escrow' && isViewerProvider" class="text-[13px] text-dark">
      Paiement reçu en séquestre ({{ escrowOrder.amount.toLocaleString('fr-FR') }} F CFA). Une fois la prestation
      terminée, marquez-la comme telle pour déclencher la validation du chercheur.
    </p>
    <button
      v-if="escrowOrder.status === 'in_escrow' && isViewerProvider"
      type="button"
      class="press mt-2 rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isDelivering"
      @click="handleMarkDelivered"
    >
      {{ isDelivering ? 'Envoi…' : 'Marquer comme terminé' }}
    </button>

    <p v-else-if="escrowOrder.status === 'in_escrow' && isViewerClient" class="text-[13px] text-muted">
      Paiement en séquestre ({{ escrowOrder.amount.toLocaleString('fr-FR') }} F CFA). Les fonds seront libérés une
      fois la prestation terminée et votre confirmation de réception.
    </p>

    <template v-else-if="escrowOrder.status === 'delivered' && isViewerClient">
      <p class="text-[13px] text-dark">
        Le prestataire a marqué la prestation comme terminée. Confirmez la réception pour libérer le paiement
        (validation automatique sous 72h sans réponse).
      </p>
      <button
        type="button"
        class="press mt-2 rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isConfirmingReceipt"
        @click="handleConfirmReceipt"
      >
        {{ isConfirmingReceipt ? 'Confirmation…' : 'Confirmer la réception' }}
      </button>
    </template>

    <p v-else-if="escrowOrder.status === 'delivered' && isViewerProvider" class="text-[13px] text-muted">
      En attente de confirmation du chercheur (validation automatique sous 72h sans réponse).
    </p>

    <p v-else-if="escrowOrder.status === 'released'" class="text-[13px] text-dark">
      Prestation terminée, paiement libéré{{ isViewerProvider ? ' vers votre solde WorkTogo' : '' }}.
    </p>

    <p v-if="deliverError" class="mt-2 text-[12.5px] text-error">{{ deliverError }}</p>
    <p v-if="receiptError" class="mt-2 text-[12.5px] text-error">{{ receiptError }}</p>
  </div>
</template>
