<script setup lang="ts">
import type { ConversationSummary, Message } from '~~/server/utils/conversationStore'

/**
 * Fil de discussion (extrait de app/pages/messages/[id].vue pour rester sous
 * la limite de lignes par fichier, sur le même principe que
 * MessageBubble.vue/EscrowStatusPanel.vue) : défilement automatique vers le
 * dernier message, regroupement par jour (séparateurs collants) et état vide
 * avec suggestions de démarrage — `suggestion-picked` remonte le texte
 * choisi, MessageComposer.vue (composant frère, possédé par la page) reste
 * seul responsable de l'écrire dans son propre champ de saisie.
 */
const props = defineProps<{
  messages: Message[]
  conversation: ConversationSummary | null
  conversationId: string
  currentUserId: string
  isViewerProvider: boolean
  isViewerClient: boolean
}>()

const emit = defineEmits<{ changed: []; 'suggestion-picked': [text: string] }>()

const { t, locale, locales } = useI18n({ useScope: 'global' })

const messageListEl = ref<HTMLElement | null>(null)
function scrollToBottom() {
  if (messageListEl.value) messageListEl.value.scrollTop = messageListEl.value.scrollHeight
}
onMounted(async () => {
  await nextTick()
  scrollToBottom()
})
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return t('messageThread.today')
  if (date.toDateString() === yesterday.toDateString()) return t('messageThread.yesterday')
  const languageTag = (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
  return date.toLocaleDateString(languageTag, { day: '2-digit', month: 'long', year: 'numeric' })
}

const messageGroups = computed(() => {
  const groups: { label: string; items: Message[] }[] = []
  for (const message of props.messages) {
    const label = dayLabel(message.createdAt)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.label === label) lastGroup.items.push(message)
    else groups.push({ label, items: [message] })
  }
  return groups
})

// Suggestions de démarrage affichées quand le fil est vide : un vrai coup de
// pouce pour lever le blocage de la « page blanche », adaptées au rôle du
// viewer (chercheur vs. prestataire).
const messageSuggestions = computed(() =>
  props.isViewerClient
    ? [
        t('messageThread.suggestion1Client'),
        t('messageThread.suggestion2Client'),
        t('messageThread.suggestion3Client'),
      ]
    : [
        t('messageThread.suggestion1Provider'),
        t('messageThread.suggestion2Provider'),
        t('messageThread.suggestion3Provider'),
      ],
)
</script>

<template>
  <div
    ref="messageListEl"
    class="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-primary/[0.03] to-transparent pb-4"
    aria-live="polite"
  >
    <div
      v-if="messageGroups.length === 0"
      class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"
    >
      <div class="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <svg class="size-6 text-primary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6a2.5 2.5 0 0 1-2.5 2.5H8l-4 3v-3.5A2.5 2.5 0 0 1 3 11.5v-6Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <p class="text-[13.5px] font-semibold text-dark">{{ t('messageThread.emptyHeading') }}</p>
      <p class="max-w-[240px] text-[12.5px] text-muted">
        {{ t('messageThread.emptyDescription', { name: conversation?.otherPartyName }) }}
      </p>
      <div class="mt-1 flex flex-wrap justify-center gap-1.5">
        <button
          v-for="suggestion in messageSuggestions"
          :key="suggestion"
          type="button"
          class="press rounded-pill border border-hairline px-3 py-1.5 text-[12px] text-dark hover:border-primary hover:text-primary"
          @click="emit('suggestion-picked', suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>

    <template v-for="group in messageGroups" :key="group.label">
      <div class="sticky top-0 z-10 flex justify-center py-1">
        <span class="rounded-pill bg-bg px-3 py-1 text-[11px] font-semibold text-muted shadow-card-sm">
          {{ group.label }}
        </span>
      </div>
      <MessageBubble
        v-for="message in group.items"
        :key="message.id"
        :message="message"
        :conversation-id="conversationId"
        :current-user-id="currentUserId"
        :is-viewer-provider="isViewerProvider"
        :is-viewer-client="isViewerClient"
        @changed="emit('changed')"
      />
    </template>
  </div>
</template>
