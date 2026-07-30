<script setup lang="ts">
/**
 * Composeur de message (extrait de app/pages/messages/[id].vue pour rester
 * sous la limite de lignes par fichier, sur le même principe que
 * RebookPrompt.vue) : champ de saisie auto-agrandissant (Entrée envoie,
 * Maj+Entrée passe à la ligne) et envoi du message. `focusWithText` est
 * exposé pour que MessageThread.vue (composant frère) puisse préremplir le
 * champ depuis ses suggestions de démarrage sans posséder l'état du brouillon.
 */
const props = defineProps<{ conversationId: string }>()
const emit = defineEmits<{ sent: [] }>()

const { t } = useI18n({ useScope: 'global' })

const draft = ref('')
const isSending = ref(false)
const sendError = ref('')
const composerEl = ref<HTMLTextAreaElement | null>(null)

function autoGrow(event: Event) {
  const el = event.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

async function sendMessage() {
  const text = draft.value.trim()
  if (!text || isSending.value) return

  isSending.value = true
  sendError.value = ''
  try {
    await $fetch(`/api/conversations/${props.conversationId}/messages`, {
      method: 'POST',
      body: { body: text },
    })
    draft.value = ''
    await nextTick()
    if (composerEl.value) composerEl.value.style.height = 'auto'
    emit('sent')
  } catch (error) {
    // Le serveur explique souvent *pourquoi* il refuse — en particulier
    // l'anti-contournement (#265), qui rejette un message contenant un numéro
    // ou un e-mail. Afficher « Le message n'a pas pu être envoyé. Réessayez. »
    // à la place laissait l'utilisateur renvoyer indéfiniment le même texte
    // sans jamais comprendre. Même traitement que FirstContactForm.
    sendError.value = apiErrorMessage(error, t('messageComposer.errorSendFailed'))
  } finally {
    isSending.value = false
  }
}

function focusWithText(text: string) {
  draft.value = text
  nextTick(() => composerEl.value?.focus())
}

defineExpose({ focusWithText })
</script>

<template>
  <div class="shrink-0">
    <form class="flex items-end gap-2 border-t border-hairline pt-4" @submit.prevent="sendMessage">
      <div
        class="flex min-w-0 flex-1 items-end rounded-[22px] border-[1.5px] border-hairline bg-bg px-4 py-2 transition-colors focus-within:border-primary"
      >
        <textarea
          ref="composerEl"
          v-model="draft"
          rows="1"
          :placeholder="t('messageComposer.placeholder')"
          :aria-label="t('messageComposer.inputAria')"
          class="max-h-[120px] min-h-[24px] w-full resize-none border-none bg-transparent py-1 text-[14.5px] text-ink outline-none placeholder:text-muted"
          @input="autoGrow"
          @keydown.enter.exact.prevent="sendMessage"
        />
      </div>
      <button
        type="submit"
        :aria-label="t('messageComposer.sendAria')"
        class="press flex size-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!draft.trim() || isSending"
      >
        <svg v-if="!isSending" class="size-[18px] translate-x-[-1px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2.5 10 17 3.3c.9-.4 1.8.5 1.4 1.4L11.7 17c-.4.9-1.7.8-2-.1l-1.9-5.4-5.4-1.9c-.9-.3-1-1.6 0-2Z" />
        </svg>
        <svg v-else class="size-[18px] animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2" stroke-opacity="0.3" />
          <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </form>
    <p v-if="sendError" class="mt-2 shrink-0 text-[12.5px] text-error">{{ sendError }}</p>
  </div>
</template>
