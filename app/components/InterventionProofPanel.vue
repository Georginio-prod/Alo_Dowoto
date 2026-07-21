<script setup lang="ts">
import type { EscrowOrder } from '~~/server/utils/escrowOrderStore'

/**
 * Preuve d'intervention in-app (#268, anti-fuite) : le prestataire enregistre
 * son arrivée (check-in) puis son départ (check-out) du lieu d'intervention.
 * Tant que le check-out n'est pas enregistré, `EscrowStatusPanel.vue`
 * désactive le bouton « Marquer comme terminé » (le serveur le refuse de
 * toute façon, voir `markEscrowOrderDelivered`).
 */
const props = defineProps<{ escrowOrder: EscrowOrder; conversationId: string }>()
const emit = defineEmits<{ changed: [] }>()

const isCheckingIn = ref(false)
const isCheckingOut = ref(false)
const proofError = ref('')

function currentLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    )
  })
}

async function handleCheckIn() {
  if (isCheckingIn.value) return
  isCheckingIn.value = true
  proofError.value = ''
  try {
    const location = await currentLocation()
    await $fetch(`/api/conversations/${props.conversationId}/check-in`, { method: 'POST', body: location ?? {} })
    emit('changed')
  } catch {
    proofError.value = "Le check-in n'a pas pu être enregistré. Réessayez."
  } finally {
    isCheckingIn.value = false
  }
}

async function handleCheckOut() {
  if (isCheckingOut.value) return
  isCheckingOut.value = true
  proofError.value = ''
  try {
    const location = await currentLocation()
    await $fetch(`/api/conversations/${props.conversationId}/check-out`, { method: 'POST', body: location ?? {} })
    emit('changed')
  } catch {
    proofError.value = "Le check-out n'a pas pu être enregistré. Réessayez."
  } finally {
    isCheckingOut.value = false
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="mb-2 rounded-field border border-hairline bg-canvas p-3">
    <p class="mb-2 text-[12px] font-semibold text-dark">Preuve d'intervention</p>

    <p v-if="escrowOrder.checkInAt === null" class="text-[12px] text-muted">
      Enregistrez votre arrivée sur le lieu d'intervention avant de commencer.
    </p>
    <button
      v-if="escrowOrder.checkInAt === null"
      type="button"
      class="press mt-1.5 rounded-field border border-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
      :disabled="isCheckingIn"
      @click="handleCheckIn"
    >
      {{ isCheckingIn ? 'Enregistrement…' : "Check-in (arrivée)" }}
    </button>

    <p v-else class="text-[12px] text-muted">
      Arrivée enregistrée à {{ formatTime(escrowOrder.checkInAt) }}.
    </p>

    <template v-if="escrowOrder.checkInAt !== null && escrowOrder.checkOutAt === null">
      <button
        type="button"
        class="press mt-1.5 rounded-field border border-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isCheckingOut"
        @click="handleCheckOut"
      >
        {{ isCheckingOut ? 'Enregistrement…' : "Check-out (départ)" }}
      </button>
    </template>

    <p v-else-if="escrowOrder.checkOutAt !== null" class="mt-1 text-[12px] text-muted">
      Départ enregistré à {{ formatTime(escrowOrder.checkOutAt) }}. Vous pouvez marquer la prestation comme terminée.
    </p>

    <p v-if="proofError" class="mt-1.5 text-[12px] text-error">{{ proofError }}</p>
  </div>
</template>
