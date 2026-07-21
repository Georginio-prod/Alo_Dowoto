<script setup lang="ts">
/**
 * "Reprendre ce prestataire" (#266, rebooking rapide) : affiché à la place
 * de l'ancien EscrowStatusPanel une fois la précédente commande terminale
 * (released/refunded, voir la page appelante). Contact et tarif du
 * prestataire sont déjà connus côté serveur (rebook.post.ts) — seule une
 * description de la nouvelle demande est requise ici.
 */
const props = defineProps<{
  conversationId: string
  providerName: string
}>()

const emit = defineEmits<{ changed: [] }>()

const showForm = ref(false)
const description = ref('')
const isSubmitting = ref(false)
const error = ref('')

async function handleSubmit() {
  const text = description.value.trim()
  if (!text || isSubmitting.value) return

  isSubmitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/rebook`, { method: 'POST', body: { description: text } })
    description.value = ''
    showForm.value = false
    emit('changed')
  } catch {
    error.value = "La demande n'a pas pu être envoyée. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mb-3 shrink-0 rounded-card border border-hairline bg-surface p-4">
    <button
      v-if="!showForm"
      type="button"
      class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover"
      @click="showForm = true"
    >
      Reprendre ce prestataire
    </button>

    <template v-else>
      <p class="mb-2 text-[13px] font-semibold text-dark">Nouvelle demande à {{ providerName }}</p>
      <textarea
        v-model="description"
        rows="2"
        placeholder="Décrivez votre nouveau besoin"
        aria-label="Description de la nouvelle demande"
        class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
      />
      <div class="mt-2 flex gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!description.trim() || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Envoi…' : 'Envoyer la demande' }}
        </button>
        <button type="button" class="press text-[12.5px] text-muted" @click="showForm = false">Annuler</button>
      </div>
      <p v-if="error" class="mt-2 text-[12.5px] text-error">{{ error }}</p>
    </template>
  </div>
</template>
