<script setup lang="ts">
import type { PublicUser } from '~~/server/utils/userStore'

/**
 * Icône de statut de compte + menu déroulant d'actions rapides (#130),
 * affiché dans AppHeader à la place des liens Connexion/Devenir prestataire
 * dès qu'une session existe.
 */

const props = defineProps<{ user: PublicUser }>()
const { t } = useI18n({ useScope: 'global' })
const { clear: clearSession } = useSession()
const { open: openChoiceModal } = useChoiceModal()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const confirming = ref<'logout' | 'payment' | 'switch-account' | null>(null)
const notice = ref('')
const isLoggingOut = ref(false)

const roleLabel = computed(() => (props.user.role === 'prestataire' ? t('accountMenu.roleProvider') : t('accountMenu.roleClient')))
const initial = computed(() => props.user.contact.replace(/^\+?228/, '').trim().charAt(0).toUpperCase() || '?')
const mySpacePath = computed(() => (props.user.role === 'prestataire' ? '/prestataire' : '/dashboard/client'))

// « Changer de compte » (#167) : un contact n'a qu'un seul rôle, fixé à la
// création (voir userStore.ts) — impossible de "devenir" l'autre rôle sur
// le même compte. La question tranche donc explicitement s'il faut
// proposer une connexion (compte déjà existant, avec un autre contact) ou
// une inscription (pas encore de compte, voir ChoiceModal.vue), plutôt que
// de deviner une réponse que l'app ne peut pas connaître.
const otherRole = computed(() => (props.user.role === 'prestataire' ? 'client' : 'prestataire'))
const otherRoleLabel = computed(() => (otherRole.value === 'prestataire' ? t('accountMenu.otherRoleProvider') : t('accountMenu.otherRoleClient')))

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
  notice.value = t('accountMenu.comingSoon', { feature })
}

function askConfirm(action: 'logout' | 'payment' | 'switch-account') {
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
    // État partagé (useSession.ts) : sans ce `clear()`, l'en-tête restait
    // affiché comme connecté après une déconnexion tant qu'aucune
    // navigation ne remontait AppHeader (ex. déconnexion depuis "/").
    clearSession()
  } finally {
    isLoggingOut.value = false
    closeMenu()
    navigateTo('/')
  }
}

function confirmPaymentChange() {
  confirming.value = null
  showComingSoon(t('accountMenu.changePaymentMethod'))
}

function switchAccountHasAccount() {
  closeMenu()
  navigateTo({ path: '/auth', query: { role: otherRole.value, mode: 'login' } })
}

function switchAccountNoAccount() {
  closeMenu()
  openChoiceModal()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

function onClickOutside(e: MouseEvent) {
  // `composedPath()` capture le chemin au moment du clic, contrairement à
  // `root.contains(e.target)` : un clic sur « Se déconnecter » remplace ce
  // bouton par le panneau de confirmation avant que ce gestionnaire (sur
  // `window`, donc après tous les autres) ne s'exécute, ce qui détache la
  // cible du DOM et faisait échouer `contains` — fermant le menu avant que
  // la confirmation ait pu s'afficher.
  if (isOpen.value && root.value && !e.composedPath().includes(root.value)) closeMenu()
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
      <span v-if="user.verified" class="text-[12px] text-primary" title="Identité vérifiée" aria-hidden="true">✓</span>
    </button>

    <div
      v-if="isOpen"
      role="menu"
      class="absolute right-0 top-[calc(100%+8px)] z-30 w-64 animate-[wt-fade_0.16s_ease-out] rounded-card border border-hairline bg-surface p-1.5 shadow-card-md"
    >
      <NuxtLink
        :to="mySpacePath"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] font-semibold text-dark hover:bg-bg"
        @click="closeMenu"
      >
        {{ t('accountMenu.mySpace') }}
      </NuxtLink>
      <NuxtLink
        to="/profil"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="closeMenu"
      >
        {{ t('accountMenu.editProfile') }}
      </NuxtLink>
      <div v-if="confirming === 'switch-account'" class="rounded-field bg-bg p-3">
        <p class="mb-2 text-[12.5px] text-dark">{{ t('accountMenu.switchAccountQuestion', { role: otherRoleLabel }) }}</p>
        <div class="flex gap-2">
          <button type="button" class="press flex-1 rounded-field bg-primary py-1.5 text-[12.5px] font-semibold text-white" @click="switchAccountHasAccount">
            {{ t('accountMenu.yes') }}
          </button>
          <button type="button" class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted" @click="switchAccountNoAccount">
            {{ t('accountMenu.no') }}
          </button>
        </div>
      </div>
      <button
        v-else
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="askConfirm('switch-account')"
      >
        {{ t('accountMenu.switchAccount') }}
      </button>
      <NuxtLink
        to="/mot-de-passe"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="closeMenu"
      >
        {{ t('accountMenu.changePassword') }}
      </NuxtLink>
      <NuxtLink
        to="/messages"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="closeMenu"
      >
        {{ t('accountMenu.myMessages') }}
      </NuxtLink>

      <template v-if="user.role === 'prestataire'">
        <div v-if="confirming === 'payment'" class="rounded-field bg-bg p-3">
          <p class="mb-2 text-[12.5px] text-dark">{{ t('accountMenu.confirmPaymentChangeQuestion') }}</p>
          <div class="flex gap-2">
            <button type="button" class="press flex-1 rounded-field bg-primary py-1.5 text-[12.5px] font-semibold text-white" @click="confirmPaymentChange">
              {{ t('accountMenu.confirm') }}
            </button>
            <button type="button" class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted" @click="cancelConfirm">
              {{ t('accountMenu.cancel') }}
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
          {{ t('accountMenu.changePaymentMethod') }}
        </button>
      </template>

      <button
        type="button"
        role="menuitem"
        class="press block w-full rounded-field px-3 py-2.5 text-left text-[13.5px] text-dark hover:bg-bg"
        @click="showComingSoon(t('accountMenu.support'))"
      >
        {{ t('accountMenu.support') }}
      </button>

      <p v-if="notice" class="px-3 py-1.5 text-[11.5px] text-muted">{{ notice }}</p>

      <div class="my-1 h-px bg-hairline" />

      <div v-if="confirming === 'logout'" class="rounded-field bg-bg p-3">
        <p class="mb-2 text-[12.5px] text-dark">{{ t('accountMenu.confirmLogoutQuestion') }}</p>
        <div class="flex gap-2">
          <button
            type="button"
            class="press flex-1 rounded-field bg-error py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
            :disabled="isLoggingOut"
            @click="confirmLogout"
          >
            {{ isLoggingOut ? t('accountMenu.loggingOut') : t('accountMenu.confirm') }}
          </button>
          <button type="button" class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted" @click="cancelConfirm">
            {{ t('accountMenu.cancel') }}
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
        {{ t('accountMenu.logout') }}
      </button>
    </div>
  </div>
</template>
