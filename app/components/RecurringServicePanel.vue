<script setup lang="ts">
import type { RecurringFrequency, RecurringService } from '~~/server/utils/recurringServiceStore'

/**
 * Offres récurrentes natives (#271) : le chercheur met en place un
 * prélèvement automatique périodique auprès du prestataire de cette
 * conversation, pour un service régulier (ménage hebdomadaire, jardinage
 * mensuel…) sans avoir à reprendre contact à chaque occurrence. Le
 * déclenchement effectif de chaque échéance est géré côté serveur
 * (server/utils/recurringServiceStore.ts) — ce composant ne fait
 * qu'afficher l'état courant et proposer de démarrer/annuler.
 */
const props = defineProps<{ recurringService: RecurringService | null; conversationId: string }>()
const emit = defineEmits<{ changed: [] }>()

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'hebdomadaire', label: 'Chaque semaine' },
  { value: 'mensuelle', label: 'Chaque mois' },
]

const showForm = ref(false)
const frequency = ref<RecurringFrequency>('hebdomadaire')
const isSubmitting = ref(false)
const error = ref('')

const canOffer = computed(() => !props.recurringService || props.recurringService.status === 'cancelled')

async function startRecurring() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/recurring`, {
      method: 'POST',
      body: { frequency: frequency.value },
    })
    showForm.value = false
    emit('changed')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, "La mise en place du service récurrent a échoué. Réessayez.")
  } finally {
    isSubmitting.value = false
  }
}

const isCancelling = ref(false)

async function cancelRecurring() {
  if (isCancelling.value) return
  isCancelling.value = true
  error.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/recurring`, { method: 'DELETE' })
    emit('changed')
  } catch (fetchError) {
    error.value = apiErrorMessage(fetchError, "L'annulation a échoué. Réessayez.")
  } finally {
    isCancelling.value = false
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="mb-3 shrink-0 rounded-card border border-hairline bg-surface p-4">
    <template v-if="canOffer">
      <button
        v-if="!showForm"
        type="button"
        class="press text-[12.5px] font-semibold text-primary underline"
        @click="showForm = true"
      >
        Configurer un service récurrent
      </button>

      <template v-else>
        <p class="mb-2 text-[13px] font-semibold text-dark">Service récurrent</p>
        <div class="mb-2 grid grid-cols-2 gap-2">
          <button
            v-for="option in FREQUENCY_OPTIONS"
            :key="option.value"
            type="button"
            class="press rounded-field border-2 py-2 text-[12.5px] font-semibold"
            :class="frequency === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-hairline text-dark'"
            :aria-pressed="frequency === option.value"
            @click="frequency = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="isSubmitting"
            @click="startRecurring"
          >
            {{ isSubmitting ? 'Activation…' : 'Activer' }}
          </button>
          <button type="button" class="press text-[12.5px] text-muted" @click="showForm = false">Annuler</button>
        </div>
      </template>
    </template>

    <template v-else-if="recurringService?.status === 'active'">
      <p class="text-[13px] text-dark">
        Service récurrent actif ({{ recurringService.frequency === 'hebdomadaire' ? 'chaque semaine' : 'chaque mois' }}).
      </p>
      <p class="mt-1 text-[12px] text-muted">Prochain prélèvement le {{ formatDate(recurringService.nextChargeAt) }}.</p>
      <button
        type="button"
        class="press mt-2 text-[12.5px] font-semibold text-error underline"
        :disabled="isCancelling"
        @click="cancelRecurring"
      >
        {{ isCancelling ? 'Annulation…' : 'Annuler le service récurrent' }}
      </button>
    </template>

    <template v-else-if="recurringService?.status === 'payment_failed'">
      <p class="text-[13px] text-error">
        Le dernier prélèvement automatique a échoué (solde insuffisant). Rechargez votre portefeuille puis relancez le
        service récurrent.
      </p>
      <button
        type="button"
        class="press mt-2 text-[12.5px] font-semibold text-error underline"
        :disabled="isCancelling"
        @click="cancelRecurring"
      >
        {{ isCancelling ? 'Annulation…' : 'Annuler le service récurrent' }}
      </button>
    </template>

    <p v-if="error" class="mt-2 text-[12.5px] text-error">{{ error }}</p>
  </div>
</template>
