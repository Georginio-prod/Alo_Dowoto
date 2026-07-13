<script setup lang="ts">
import type { User } from '~~/server/utils/userStore'

/**
 * Icône de statut de compte + menu déroulant d'actions rapides (#130),
 * affiché dans AppHeader à la place des liens Connexion/Devenir prestataire
 * dès qu'une session existe.
 */

const props = defineProps<{ user: User }>()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const confirming = ref<'logout' | 'payment' | null>(null)
const notice = ref('')
const isLoggingOut = ref(false)

const roleLabel = computed(() => (props.user.role === 'prestataire' ? 'Prestataire' : 'Chercheur'))
const initial = computed(() => props.user.contact.replace(/^\+?228/, '').trim().charAt(0).toUpperCase() || '?')

function toggleMenu() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) {
    confirming.value = null
    notice.value = ''
  }
}

function closeMenu() {
  isOpen.value = false
  confirming.value = null
  notice.value = ''
}

function showComingSoon(feature: string) {
  notice.value = `${feature} : fonctionnalité à venir.`
}

function askConfirm(action: 'logout' | 'payment') {
  confirming.value = action
  notice.value = ''
}

function cancelConfirm() {
  confirming.value = null
}

async function confirmLogout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/session', { method: 'DELETE' })
  } finally {
    isLoggingOut.value = false
    closeMenu()
    navigateTo('/')
  }
}

function confirmPaymentChange() {
  confirming.value = null
  showComingSoon('Changer le mode de paiement')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

function onClickOutside(e: MouseEvent) {
  if (isOpen.value && root.value && !root.value.contains(e.target as Node)) closeMenu()
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="root" class="relative" @keydown="onKeydown">
    <button
      type="button"
      class="press flex items-center gap-2 rounded-pill border border-hairline bg-white py-1.5 pl-1.5 pr-3 hover:border-primary/40"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click="toggleMenu"
    >
      <span
        class="flex size-7 shrink-0 items-center justify-center rounded-full bg-dark text-[12px] font-bold text-white"
      >
        {{ initial }}
      </span>
      <span class="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">{{ roleLabel }}</span>
    </button>

    <div
      v-if="isOpen"
      role="menu"
      class="absolute right-0 top-[calc(100%+8px)] z-30 w-64 animate-[wt-fade_0.16s_ease-out] rounded-card border border-hairline bg-surface p-1.5 shadow-card-md"
    >
      <button
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="showComingSoon('Changer la photo de profil')"
      >
        Changer la photo de profil
      </button>
      <button
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="showComingSoon('Changer le mot de passe')"
      >
        Changer le mot de passe
      </button>
      <NuxtLink
        to="/messages"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="closeMenu"
      >
        Mes messages
      </NuxtLink>

      <template v-if="user.role === 'prestataire'">
        <div v-if="confirming === 'payment'" class="rounded-field bg-bg p-3">
          <p class="mb-2 text-[12.5px] text-dark">Confirmer le changement de mode de paiement ?</p>
          <div class="flex gap-2">
            <button type="button" class="press flex-1 rounded-field bg-primary py-1.5 text-[12.5px] font-semibold text-white" @click="confirmPaymentChange">
              Confirmer
            </button>
            <button type="button" class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted" @click="cancelConfirm">
              Annuler
            </button>
          </div>
        </div>
        <button
          v-else
          type="button"
          role="menuitem"
          class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
          @click="askConfirm('payment')"
        >
          Changer le mode de paiement
        </button>
      </template>

      <button
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="showComingSoon('Assistance')"
      >
        Assistance
      </button>

      <p v-if="notice" class="px-3 py-1.5 text-[11.5px] text-muted">{{ notice }}</p>

      <div class="my-1 h-px bg-hairline" />

      <div v-if="confirming === 'logout'" class="rounded-field bg-bg p-3">
        <p class="mb-2 text-[12.5px] text-dark">Confirmer la déconnexion ?</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="press flex-1 rounded-field bg-error py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
            :disabled="isLoggingOut"
            @click="confirmLogout"
          >
            {{ isLoggingOut ? 'Déconnexion…' : 'Confirmer' }}
          </button>
          <button type="button" class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted" @click="cancelConfirm">
            Annuler
          </button>
        </div>
      </div>
      <button
        v-else
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] font-semibold text-error hover:bg-error/10"
        @click="askConfirm('logout')"
      >
        Se déconnecter
      </button>
    </div>
  </div>
</template>
