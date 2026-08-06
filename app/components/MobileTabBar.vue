<script setup lang="ts">
/**
 * Barre d'onglets mobile (thumb-first) du dashboard unifié — coquille commune
 * de app/pages/dashboard/index.vue (cible mobile / APK).
 *
 * ⚠️ Reconstruit après suppression accidentelle du fichier untracked d'origine
 * (voir docs/refonte). Reconstitué fidèlement à partir de son contrat, défini
 * par ses trois consommateurs :
 *   - dashboard/index.vue : `<MobileTabBar :role="user?.role" />` (prop `role`),
 *     et `pb-28 lg:pb-8` réserve la hauteur de la barre puis la libère sur ≥ lg
 *     (barre masquée sur desktop) ;
 *   - AssistantWidget.vue et ThemeSwitcher.vue : lisent `var(--tabbar-height)`,
 *     que ce composant publie sur `:root` tant qu'il est monté (nul sinon), pour
 *     se relever au-dessus de la barre sans connaître les pages qui l'affichent.
 *
 * Icône ET libellé (jamais d'icône seule), cibles ≥ 56 px, `aria-current` sur
 * l'onglet actif. Role-aware. Dérive des tokens (text-primary, bg-surface…).
 */
const props = defineProps<{ role?: string }>()

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

type IconKey = 'home' | 'search' | 'messages' | 'wallet' | 'profile' | 'requests' | 'agenda' | 'earnings'
interface Tab {
  key: string
  to: string
  label: string
  icon: IconKey
  match?: string[]
}

const ICON_PATHS: Record<IconKey, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20.5 20.5 16 16',
  messages: 'M20.5 11.5a8 8 0 0 1-11.9 7L4 20l1.6-4.4A8 8 0 1 1 20.5 11.5z',
  wallet: 'M4 8h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11M16.5 13.5h.5',
  profile: 'M4.5 20a7.5 7.5 0 0 1 15 0M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  requests: 'M9 4.5h6M7 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1M9 3.5h6v2H9zM8.5 11h7M8.5 15h7',
  agenda: 'M7 3v3M17 3v3M4.5 8.5h15M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 12.5h3v3H8z',
  earnings: 'M4 8h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11M16.5 13.5h.5',
}

const clientTabs = computed<Tab[]>(() => [
  { key: 'home', to: '/dashboard', label: t('mobileTabBar.home'), icon: 'home' },
  { key: 'search', to: '/categories', label: t('mobileTabBar.search'), icon: 'search', match: ['/resultats', '/demande', '/matching', '/formules', '/paiement'] },
  { key: 'messages', to: '/messages', label: t('mobileTabBar.messages'), icon: 'messages' },
  { key: 'wallet', to: '/solde', label: t('mobileTabBar.wallet'), icon: 'wallet', match: ['/favoris', '/abonnement', '/parrainage'] },
  { key: 'profile', to: '/profil', label: t('mobileTabBar.profile'), icon: 'profile' },
])

const providerTabs = computed<Tab[]>(() => [
  { key: 'agenda', to: '/dashboard', label: t('mobileTabBar.agenda'), icon: 'agenda' },
  { key: 'requests', to: '/prestataire/demandes', label: t('mobileTabBar.requests'), icon: 'requests' },
  { key: 'earnings', to: '/prestataire/solde', label: t('mobileTabBar.earnings'), icon: 'earnings', match: ['/solde', '/abonnement'] },
  { key: 'messages', to: '/messages', label: t('mobileTabBar.messages'), icon: 'messages' },
  { key: 'profile', to: '/profil', label: t('mobileTabBar.profile'), icon: 'profile', match: ['/prestataire/profil'] },
])

const tabs = computed<Tab[]>(() => {
  if (props.role === 'prestataire') return providerTabs.value
  if (props.role === 'client') return clientTabs.value
  return []
})

function isActive(tab: Tab): boolean {
  if (tab.to === '/dashboard') return route.path === '/dashboard'
  if (route.path === tab.to || route.path.startsWith(`${tab.to}/`)) return true
  return (tab.match ?? []).some((p) => route.path === p || route.path.startsWith(`${p}/`))
}

// Publie la hauteur réelle de la barre dans `--tabbar-height` tant qu'elle est
// montée (0 quand masquée sur ≥ lg, offsetHeight nul en display:none), lue par
// AssistantWidget/ThemeSwitcher. Retirée au démontage.
const bar = ref<HTMLElement | null>(null)
function publishHeight() {
  if (!import.meta.client) return
  document.documentElement.style.setProperty('--tabbar-height', `${bar.value?.offsetHeight ?? 0}px`)
}
onMounted(() => {
  if (!import.meta.client) return
  nextTick(publishHeight)
  window.addEventListener('resize', publishHeight)
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', publishHeight)
  document.documentElement.style.removeProperty('--tabbar-height')
})
</script>

<template>
  <nav
    v-if="tabs.length"
    ref="bar"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom);"
    :aria-label="t('mobileTabBar.ariaLabel')"
  >
    <ul class="mx-auto flex max-w-md items-stretch">
      <li v-for="tab in tabs" :key="tab.key" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="press flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold"
          :class="isActive(tab) ? 'text-primary' : 'text-muted'"
          :aria-current="isActive(tab) ? 'page' : undefined"
        >
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="ICON_PATHS[tab.icon]" />
          </svg>
          <span class="leading-none">{{ tab.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
