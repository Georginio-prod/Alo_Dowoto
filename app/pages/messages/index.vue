<script setup lang="ts">
import type { ConversationSummary } from '~~/server/utils/conversationStore'

definePageMeta({ layout: 'blank' })

const { data, pending } = await useFetch<{ conversations: ConversationSummary[] }>('/api/conversations')
const conversations = computed(() => data.value?.conversations ?? [])

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function goHome() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <header class="border-b border-hairline bg-surface">
      <div class="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <NuxtLink to="/" class="text-[19px] font-extrabold text-dark">
            Work<span class="text-primary">Togo</span>
          </NuxtLink>
          <p class="text-[14.5px] text-muted">Mes messages</p>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-[720px] px-5 py-6">
      <p v-if="pending" class="text-[13px] text-muted">Chargement…</p>

      <ResultsEmptyState
        v-else-if="conversations.length === 0"
        title="Aucune conversation"
        description="Aucun message. Écrivez le premier pour démarrer la conversation."
        action-label="Retour à l'accueil"
        @action="goHome"
      />

      <ul v-else class="flex flex-col gap-2">
        <li v-for="conversation in conversations" :key="conversation.id">
          <NuxtLink
            :to="`/messages/${conversation.id}`"
            class="press flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 hover:border-primary/40"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#e5e7eb_0_10px,#eef0f2_10px_20px)]"
            >
              <span class="rounded-pill bg-black/40 px-1.5 py-0.5 text-[8px] font-semibold text-white">photo</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-[14.5px] font-bold text-dark">{{ conversation.otherPartyName }}</span>
                <span v-if="conversation.lastMessage" class="shrink-0 text-[11.5px] text-muted">
                  {{ formatTime(conversation.lastMessage.createdAt) }}
                </span>
              </div>
              <p v-if="conversation.otherPartySector" class="text-[12px] text-muted">
                {{ conversation.otherPartySector }}
              </p>
              <p class="truncate text-[13px] text-muted">
                {{ conversation.lastMessage?.body ?? 'Aucun message. Écrivez le premier pour démarrer la conversation.' }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
