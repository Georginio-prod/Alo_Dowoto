<script setup lang="ts">
const { conversations, pending, ensure } = useConversations()
await ensure()

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
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
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
          placeholder="Rechercher une conversation"
          aria-label="Rechercher une conversation"
          class="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
        >
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <p v-if="pending" class="p-4 text-[13px] text-muted">Chargement…</p>

      <p v-else-if="conversations.length === 0" class="p-4 text-[13px] leading-relaxed text-muted">
        Aucune conversation pour l'instant. Contactez un prestataire depuis ses résultats de recherche pour démarrer.
      </p>

      <p v-else-if="filteredConversations.length === 0" class="p-4 text-[13px] text-muted">
        Aucune conversation ne correspond à « {{ query }} ».
      </p>

      <ul v-else>
        <li v-for="conversation in filteredConversations" :key="conversation.id">
          <NuxtLink
            :to="`/messages/${conversation.id}`"
            class="press flex items-center gap-3 border-b border-hairline px-3.5 py-3 hover:bg-bg"
            :class="conversation.id === activeConversationId ? 'bg-primary/8' : ''"
          >
            <ConversationAvatar :name="conversation.otherPartyName" :seed="conversation.id" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-[14px] font-bold text-dark">{{ conversation.otherPartyName }}</span>
                <span v-if="conversation.lastMessage" class="shrink-0 text-[11px] text-muted">
                  {{ formatTime(conversation.lastMessage.createdAt) }}
                </span>
              </div>
              <p class="truncate text-[12.5px] text-muted">
                {{ conversation.lastMessage?.body ?? 'Écrivez le premier message.' }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
