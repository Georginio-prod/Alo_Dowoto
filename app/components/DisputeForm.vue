<script setup lang="ts">
/**
 * Formulaire d'ouverture d'un litige (#197/#274), avec preuves optionnelles
 * — extrait de EscrowStatusPanel.vue pour rester sous la limite de lignes
 * par fichier. Le déclencheur ("Contester la prestation") et son état de
 * bascule restent dans le parent, à côté du bouton "Confirmer la réception".
 */
const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{ submitted: []; cancel: [] }>()

const reason = ref('')
const evidence = ref('')
const isSubmitting = ref(false)
const error = ref('')

async function handleSubmit() {
  if (isSubmitting.value || !reason.value.trim()) return
  isSubmitting.value = true
  error.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/dispute`, {
      method: 'POST',
      body: { reason: reason.value.trim(), evidence: evidence.value.trim() || undefined },
    })
    emit('submitted')
  } catch {
    error.value = "Le litige n'a pas pu être ouvert. Réessayez."
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mt-3 space-y-2 border-t border-hairline pt-3">
    <textarea
      v-model="reason"
      rows="2"
      placeholder="Motif du litige (obligatoire)"
      aria-label="Motif du litige"
      class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
    />
    <textarea
      v-model="evidence"
      rows="2"
      placeholder="Preuves à l'appui : description détaillée, liens vers des photos (optionnel)"
      aria-label="Preuves à l'appui du litige"
      class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
    />
    <div class="flex gap-2">
      <button
        type="button"
        class="press rounded-field border border-error px-4 py-2 text-[12.5px] font-semibold text-error disabled:cursor-not-allowed disabled:opacity-45"
        :disabled="!reason.trim() || isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? 'Envoi…' : 'Confirmer le litige' }}
      </button>
      <button type="button" class="press text-[12.5px] text-muted" @click="emit('cancel')">
        Retour
      </button>
    </div>
    <p v-if="error" class="text-[12.5px] text-error">{{ error }}</p>
  </div>
</template>
