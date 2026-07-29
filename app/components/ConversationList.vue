<script setup lang="ts">
import { resolveMessagePreview } from '~/utils/messageTranslation'

const { t, locale, locales } = useI18n({ useScope: 'global' })

const languageTag = computed(() =>
  (locales.value as Array<{ code: string, language?: string }>).find((l) => l.code === locale.value)?.language ?? 'fr-FR',
)

const { conversations, pending, ensure } = useConversations()
await ensure()

/** Repli français si le dernier message n'existe pas encore (fil jamais commencé) — même clé que ConversationSummary. */
function lastMessagePreview(lastMessage: { body: string; translationKey: string | null; translationParams: Record<string, unknown> | null } | null): string {
  if (!lastMessage) return t('conversationList.writeFirstMessage')
  return resolveMessagePreview(lastMessage, t, languageTag.value)
}

const route = useRoute()
const query = ref('')

const activeConversationId = computed(() =>
  route.path.startsWith('/messages/') ? String(route.params.id ?? '') : null,
)

const filteredConversations = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return conversations.value
  return conversations.value.filter((conversation) => conversation.otherPartyName.toLowerCase().includes(term))
})

function formatTime(timestamp: number): string {
  const languageTag = (locales.value as Array<{ code: string, language?: string }>)
    .find((l) => l.code === locale.value)?.language ?? 'fr-FR'
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString(languageTag, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(languageTag, { day: '2-digit', month: '2-digit' })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-hairline p-3.5">
      <NuxtLink to="/" class="press mb-3 block px-1 text-[17px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>
      <div class="flex items-center gap-2 rounded-pill border border-hairline bg-bg px-3.5 py-2">
        <svg class="size-4 shrink-0 opacity-55" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6" />
          <line x1="12.3" y1="12.3" x2="17" y2="17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model="query"
          type="text"
          :placeholder="t('conversationList.searchPlaceholder')"
          :aria-label="t('conversationList.searchPlaceholder')"
          class="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
        >
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <p v-if="pending" class="p-4 text-[13px] text-muted">{{ t('conversationList.loading') }}</p>

      <p v-else-if="conversations.length === 0" class="p-4 text-[13px] leading-relaxed text-muted">
        {{ t('conversationList.emptyState') }}
      </p>

      <p v-else-if="filteredConversations.length === 0" class="p-4 text-[13px] text-muted">
        {{ t('conversationList.noMatch', { query }) }}
      </p>

      <ul v-else class="space-y-1 p-2">
        <li v-for="conversation in filteredConversations" :key="conversation.id">
          <NuxtLink
            :to="`/messages/${conversation.id}`"
            class="press flex items-center gap-3 rounded-card border-l-[3px] px-3 py-2.5 transition-colors"
            :class="
              conversation.id === activeConversationId
                ? 'border-primary bg-primary/8 shadow-card-sm'
                : 'border-transparent hover:bg-bg'
            "
          >
            <div class="relative shrink-0">
              <ConversationAvatar :name="conversation.otherPartyName" :seed="conversation.id" />
              <span
                v-if="conversation.unreadCount > 0"
                class="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-surface"
              >
                {{ conversation.unreadCount > 9 ? '9+' : conversation.unreadCount }}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-[14px] font-bold text-dark">{{ conversation.otherPartyName }}</span>
                <span
                  v-if="conversation.lastMessage"
                  class="shrink-0 text-[11px]"
                  :class="conversation.unreadCount > 0 ? 'font-semibold text-primary' : 'text-muted'"
                >
                  {{ formatTime(conversation.lastMessage.createdAt) }}
                </span>
              </div>
              <p
                class="truncate text-[12.5px]"
                :class="conversation.unreadCount > 0 ? 'font-semibold text-dark' : 'text-muted'"
              >
                {{ lastMessagePreview(conversation.lastMessage) }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
