<script setup lang="ts">
import type { FavoriteConversationEntry } from '~/utils/favoriteConversations'

/**
 * Barre de raccourci messagerie (#225) : montée une seule fois dans
 * `app.vue` pour apparaître sur toutes les pages, réservée au chercheur
 * connecté (favoris = relation client → prestataire, voir favoriteStore.ts).
 * Cachée sur /messages : y afficher un raccourci vers la messagerie alors
 * qu'on y est déjà serait redondant et chevaucherait l'en-tête de
 * ConversationList (layout `messages`, sans AppHeader).
 *
 * Pas d'indicateur « en ligne » : aucun système de présence n'existe côté
 * serveur pour l'instant (limitation connue, voir la discussion de #225) —
 * mieux vaut l'omettre que d'afficher un état inventé.
 */
const MAX_VISIBLE_AVATARS = 4

const route = useRoute()
const { user: sessionUser, ensure: ensureSession } = useSession()
await ensureSession()

const isClient = computed(() => sessionUser.value?.role === 'client')
const hidden = computed(() => !isClient.value || route.path.startsWith('/messages'))

const { entries, totalUnread, ensure: ensureFavorites } = useFavoriteConversations()
if (isClient.value) await ensureFavorites()

const visibleEntries = computed(() => entries.value.slice(0, MAX_VISIBLE_AVATARS))
const overflowCount = computed(() => Math.max(0, entries.value.length - MAX_VISIBLE_AVATARS))

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
  return letters.join('') || '?'
}

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** Favori jamais contacté (pas encore de conversation) : on renvoie vers /favoris plutôt que de créer une conversation ici, pour ne pas contourner le quota de contacts (#63) ni la vérification d'identité que ce flux impose ailleurs. */
function entryHref(entry: FavoriteConversationEntry): string {
  return entry.conversationId ? `/messages/${entry.conversationId}` : '/favoris'
}
</script>

<template>
  <div v-if="!hidden" class="fixed right-4 top-24 z-40 flex flex-col items-end gap-2 lg:top-32">
    <div class="hidden items-center gap-1 rounded-pill border border-hairline bg-surface p-1.5 shadow-card-md sm:flex">
      <TransitionGroup name="fmb" tag="div" class="flex items-center -space-x-2">
        <NuxtLink
          v-for="entry in visibleEntries"
          :key="entry.providerId"
          :to="entryHref(entry)"
          :aria-label="`Aller à la conversation avec ${entry.name}`"
          class="press relative block size-10 shrink-0 rounded-full border-2 border-surface bg-primary/12 text-center text-[13px] font-bold leading-10 text-primary hover:z-10 hover:border-primary"
        >
          <img v-if="entry.avatarUrl" :src="entry.avatarUrl" alt="" class="size-full rounded-full object-cover">
          <span v-else aria-hidden="true">{{ initials(entry.name) }}</span>
          <span
            v-if="entry.unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold leading-[18px] text-white"
            aria-hidden="true"
          >
            {{ badgeLabel(entry.unreadCount) }}
          </span>
        </NuxtLink>
      </TransitionGroup>

      <span
        v-if="overflowCount > 0"
        class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-bg text-[12px] font-bold text-muted"
        aria-hidden="true"
      >
        +{{ overflowCount }}
      </span>

      <NuxtLink
        to="/messages"
        aria-label="Voir toutes mes conversations"
        class="press relative ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-dark hover:text-primary"
      >
        <svg class="size-5" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2.5 4.5h13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" />
          <path d="M2 5l7 5 7-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span
          v-if="totalUnread > 0"
          class="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold leading-[18px] text-white"
          aria-hidden="true"
        >
          {{ badgeLabel(totalUnread) }}
        </span>
      </NuxtLink>
    </div>

    <NuxtLink
      to="/messages"
      aria-label="Voir mes messages"
      class="press relative flex size-11 items-center justify-center rounded-full border border-hairline bg-surface text-dark shadow-card-md sm:hidden"
    >
      <svg class="size-5" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2.5 4.5h13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" />
        <path d="M2 5l7 5 7-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span
        v-if="totalUnread > 0"
        class="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold leading-[18px] text-white"
        aria-hidden="true"
      >
        {{ badgeLabel(totalUnread) }}
      </span>
    </NuxtLink>
  </div>
</template>
