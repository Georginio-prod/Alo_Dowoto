<script setup lang="ts">
/**
 * "Proposer un nouveau créneau" (#270, reprogrammation d'intervention) —
 * extrait de EscrowStatusPanel.vue pour rester sous la limite de lignes par
 * fichier, sur le même principe que RebookPrompt.vue. Affiché côté
 * prestataire pendant que la commande est en séquestre ; le chercheur
 * confirme depuis la bulle de message correspondante (MessageBubble.vue).
 */
const props = defineProps<{
  conversationId: string
}>()

const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n({ useScope: 'global' })

const showForm = ref(false)
const proposedDateTime = ref('')
const note = ref('')
const isProposing = ref(false)
const error = ref('')

async function handleSubmit() {
  if (isProposing.value || !proposedDateTime.value) return
  const proposedAt = new Date(proposedDateTime.value).getTime()
  if (!Number.isFinite(proposedAt)) return

  isProposing.value = true
  error.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/propose-reschedule`, {
      method: 'POST',
      body: { proposedAt, note: note.value.trim() || undefined },
    })
    proposedDateTime.value = ''
    note.value = ''
    showForm.value = false
    emit('changed')
  } catch {
    error.value = t('reschedulePrompt.errorSendFailed')
  } finally {
    isProposing.value = false
  }
}
</script>

<template>
  <div class="mt-3 border-t border-hairline pt-3">
    <button
      v-if="!showForm"
      type="button"
      class="press text-[12.5px] font-semibold text-primary underline"
      @click="showForm = true"
    >
      {{ t('reschedulePrompt.proposeCta') }}
    </button>

    <div v-else class="space-y-2">
      <input
        v-model="proposedDateTime"
        type="datetime-local"
        :aria-label="t('reschedulePrompt.dateTimeAria')"
        class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
      >
      <textarea
        v-model="note"
        rows="2"
        :placeholder="t('reschedulePrompt.notePlaceholder')"
        :aria-label="t('reschedulePrompt.noteAria')"
        class="w-full rounded-field border-[1.5px] border-hairline px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="press rounded-field bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!proposedDateTime || isProposing"
          @click="handleSubmit"
        >
          {{ isProposing ? t('reschedulePrompt.sending') : t('reschedulePrompt.sendCta') }}
        </button>
        <button type="button" class="press text-[12.5px] text-muted" @click="showForm = false">
          {{ t('reschedulePrompt.cancel') }}
        </button>
      </div>
      <p v-if="error" class="text-[12.5px] text-error">{{ error }}</p>
    </div>
  </div>
</template>
