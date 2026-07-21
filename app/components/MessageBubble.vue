<script setup lang="ts">
import type { Message } from '~~/server/utils/conversationStore'

/**
 * Une bulle du fil de discussion (#hub-messages-automatiques) : message
 * classique aligné selon l'émetteur, ou message automatique WorkTogo centré
 * avec son action éventuelle (confirmer la prise en charge, partager la
 * localisation) — extrait de app/pages/messages/[id].vue pour rester sous
 * la limite de lignes par fichier, sur le même principe que
 * EscrowStatusPanel.vue (logique de mutation possédée par le composant,
 * `changed` émis pour que la page rafraîchisse le fil).
 */
const props = defineProps<{
  message: Message
  conversationId: string
  currentUserId: string
  isViewerProvider: boolean
  isViewerClient: boolean
}>()
const emit = defineEmits<{ changed: [] }>()

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const isConfirmingOrder = ref(false)
const confirmOrderError = ref('')

async function confirmOrder() {
  if (isConfirmingOrder.value) return
  isConfirmingOrder.value = true
  confirmOrderError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/confirm-order`, { method: 'POST' })
    emit('changed')
  } catch {
    confirmOrderError.value = "La confirmation n'a pas pu être effectuée. Réessayez."
  } finally {
    isConfirmingOrder.value = false
  }
}

// Coordonnées prises depuis la géolocalisation du navigateur au moment du
// clic, jamais suivies en continu — un seul point envoyé à la demande.
const isSharingLocation = ref(false)
const shareLocationError = ref('')

async function shareLocation() {
  if (isSharingLocation.value) return
  if (!('geolocation' in navigator)) {
    shareLocationError.value = "La géolocalisation n'est pas disponible sur cet appareil."
    return
  }
  isSharingLocation.value = true
  shareLocationError.value = ''
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await $fetch(`/api/conversations/${props.conversationId}/share-location`, {
          method: 'POST',
          body: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
        emit('changed')
      } catch {
        shareLocationError.value = 'Le partage de localisation a échoué. Réessayez.'
      } finally {
        isSharingLocation.value = false
      }
    },
    () => {
      shareLocationError.value = "Localisation refusée ou indisponible. Autorisez l'accès à votre position puis réessayez."
      isSharingLocation.value = false
    },
  )
}

const locationMapUrl = computed(() =>
  props.message.location ? `https://www.google.com/maps?q=${props.message.location.lat},${props.message.location.lng}` : '#',
)

// Reprogrammation d'intervention (#270) : le prestataire propose un nouveau
// créneau (message `reschedule_request`, posté par lui-même — voir
// propose-reschedule.post.ts), le chercheur confirme depuis cette bulle.
const isConfirmingReschedule = ref(false)
const confirmRescheduleError = ref('')

async function confirmReschedule() {
  if (isConfirmingReschedule.value) return
  isConfirmingReschedule.value = true
  confirmRescheduleError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/confirm-reschedule`, { method: 'POST' })
    emit('changed')
  } catch {
    confirmRescheduleError.value = "La confirmation n'a pas pu être effectuée. Réessayez."
  } finally {
    isConfirmingReschedule.value = false
  }
}
</script>

<template>
  <div
    class="flex"
    :class="message.senderRole === 'system' ? 'justify-center' : message.senderId === currentUserId ? 'justify-end' : 'justify-start'"
  >
    <div
      v-if="message.senderRole === 'system'"
      class="max-w-[85%] rounded-card border border-dashed border-primary/30 bg-primary/5 px-3.5 py-2.5 text-center text-[13px] text-dark"
    >
      <p>🔔 {{ message.body }}</p>
      <p class="mt-1 text-[10.5px] text-muted">{{ formatTime(message.createdAt) }}</p>

      <button
        v-if="message.kind === 'order_confirmation' && !message.resolvedAt && isViewerProvider"
        type="button"
        class="press mt-2 rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isConfirmingOrder"
        @click="confirmOrder"
      >
        {{ isConfirmingOrder ? 'Confirmation…' : 'Confirmer la prise en charge' }}
      </button>
      <p v-if="confirmOrderError" class="mt-1.5 text-[11.5px] text-error">{{ confirmOrderError }}</p>

      <button
        v-if="message.kind === 'location_request' && !message.resolvedAt && isViewerClient"
        type="button"
        class="press mt-2 rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="isSharingLocation"
        @click="shareLocation"
      >
        {{ isSharingLocation ? 'Envoi…' : 'Partager ma localisation' }}
      </button>
      <p v-if="shareLocationError" class="mt-1.5 text-[11.5px] text-error">{{ shareLocationError }}</p>
    </div>

    <div
      v-else
      class="max-w-[75%] rounded-card px-3.5 py-2.5 text-[13.5px]"
      :class="message.senderId === currentUserId ? 'bg-dark text-white' : 'border border-hairline bg-surface text-dark'"
    >
      <p>{{ message.body }}</p>
      <a
        v-if="message.kind === 'location_shared' && message.location"
        :href="locationMapUrl"
        target="_blank"
        rel="noopener"
        class="press mt-1 block text-[12.5px] font-semibold underline"
      >
        Voir sur la carte →
      </a>

      <template v-if="message.kind === 'reschedule_request' && !message.resolvedAt && isViewerClient">
        <button
          type="button"
          class="press mt-2 rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="isConfirmingReschedule"
          @click="confirmReschedule"
        >
          {{ isConfirmingReschedule ? 'Confirmation…' : 'Confirmer le nouveau créneau' }}
        </button>
        <p v-if="confirmRescheduleError" class="mt-1.5 text-[11.5px] text-error">{{ confirmRescheduleError }}</p>
      </template>
      <p v-else-if="message.kind === 'reschedule_request' && message.resolvedAt" class="mt-1 text-[11.5px] opacity-70">
        ✓ Créneau confirmé
      </p>

      <p class="mt-1 text-[10.5px] opacity-70">{{ formatTime(message.createdAt) }}</p>
    </div>
  </div>
</template>
