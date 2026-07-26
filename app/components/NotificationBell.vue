<script setup lang="ts">
/**
 * Centre de notifications (#360, premier incrément : nouveau message reçu)
 * — cloche dans AppHeader, visible pour les deux rôles (contrairement à
 * FavoritesMessagingBar.vue, réservée au chercheur). Ouvrir le panneau
 * marque tout comme lu côté serveur, mais le statut « non lu » au moment de
 * l'ouverture reste affiché visuellement (capturé avant l'appel) pour que
 * l'utilisateur distingue ce qui est nouveau de ce qu'il a déjà vu.
 */
const POLL_INTERVAL_MS = 25_000

const { notifications, unreadCount, ensure, refresh, markAllRead } = useNotifications()
await ensure()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const unreadIdsAtOpen = ref(new Set<string>())
let pollTimer: ReturnType<typeof setInterval> | null = null

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count)
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

async function toggle() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return

  unreadIdsAtOpen.value = new Set(notifications.value.filter((n) => n.readAt === null).map((n) => n.id))
  await markAllRead()
}

function close() {
  isOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function onClickOutside(e: MouseEvent) {
  if (isOpen.value && root.value && !e.composedPath().includes(root.value)) close()
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('click', onClickOutside)
  pollTimer = setInterval(refresh, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('click', onClickOutside)
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <button
      type="button"
      class="press relative flex size-9 shrink-0 items-center justify-center rounded-full text-dark hover:bg-bg"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      aria-label="Notifications"
      @click="toggle"
    >
      <svg class="size-[19px]" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M4 7.5a5 5 0 0 1 10 0c0 3 1 4 1.5 4.5h-13C3 11.5 4 10.5 4 7.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
        <path d="M7.2 14.5a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute right-0.5 top-0.5 flex min-w-[16px] items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold leading-[16px] text-white"
        aria-hidden="true"
      >
        {{ badgeLabel(unreadCount) }}
      </span>
    </button>

    <div
      v-if="isOpen"
      role="menu"
      class="absolute right-0 top-[calc(100%+8px)] z-30 max-h-96 w-80 animate-[wt-fade_0.16s_ease-out] overflow-y-auto rounded-card border border-hairline bg-surface p-1.5 shadow-card-md"
    >
      <p class="px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-muted">Notifications</p>

      <p v-if="notifications.length === 0" class="px-3 py-4 text-center text-[13px] text-muted">
        Aucune notification pour le moment.
      </p>

      <NuxtLink
        v-for="notification in notifications"
        :key="notification.id"
        :to="notification.conversationId ? `/messages/${notification.conversationId}` : '/messages'"
        role="menuitem"
        class="press block rounded-field px-3 py-2.5 text-left hover:bg-bg"
        :class="unreadIdsAtOpen.has(notification.id) ? 'bg-primary/5' : ''"
        @click="close"
      >
        <span class="flex items-start justify-between gap-2">
          <span class="text-[13px] font-semibold text-dark">{{ notification.title }}</span>
          <span class="shrink-0 whitespace-nowrap text-[11px] text-muted">{{ formatTime(notification.createdAt) }}</span>
        </span>
        <span class="mt-0.5 block truncate text-[12.5px] text-muted">{{ notification.body }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
