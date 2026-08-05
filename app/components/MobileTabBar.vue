<script setup lang="ts">
/**
 * Barre d'onglets mobile (thumb-first) — refonte UX mobile (#refonte-ux-mobile).
 *
 * L'expérience chercheur/public (layout `default.vue`) n'avait aucune
 * navigation sur petit écran : la deuxième ligne de menu (AppNavBar) est
 * `hidden lg:block`, il ne restait que l'en-tête compact (logo + recherche).
 * Cette barre fixe en bas d'écran donne accès en **un seul tap** aux quatre
 * destinations clés, avec **icône ET libellé** (jamais d'icône seule), des
 * cibles tactiles ≥ 48 px et `aria-current` sur l'onglet actif.
 *
 * Role-aware : le jeu d'onglets s'adapte au rôle (chercheur / prestataire).
 * Masquée pour les visiteurs non connectés et sur ≥ lg (`lg:hidden`), où la
 * navigation desktop existante prend le relais. Purement additive.
 */
const { user } = useSession()
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

/**
 * Compteurs de badge par clé d'onglet (ex. `{ requests: 3 }`) — un pastille de
 * notification s'affiche sur l'onglet correspondant. Sert au prestataire dont
 * l'onglet « Demandes » est le gagne-pain : il doit être impossible à manquer.
 */
const props = defineProps<{ badges?: Record<string, number> }>()

function badgeCount(tab: Tab): number {
  const n = props.badges?.[tab.key] ?? 0
  return Number.isFinite(n) && n > 0 ? n : 0
}

function tabAriaLabel(tab: Tab): string {
  const n = badgeCount(tab)
  return n > 0 ? `${tab.label}, ${t('nav.tabs.newBadge', n)}` : tab.label
}

type IconKey = 'home' | 'requests' | 'messages' | 'account' | 'today' | 'revenue'
interface Tab {
  key: string
  to: string
  label: string
  icon: IconKey
  /** Préfixes de chemin qui gardent l'onglet actif (sous-pages d'une section). */
  match?: string[]
}

const ICON_PATHS: Record<IconKey, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  requests: 'M9 4.5h6M7 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-1M9 3.5h6v2H9zM8.5 11h7M8.5 15h7',
  messages: 'M20.5 11.5a8 8 0 0 1-11.9 7L4 20l1.6-4.4A8 8 0 1 1 20.5 11.5z',
  account: 'M4.5 20a7.5 7.5 0 0 1 15 0M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  today: 'M7 3v3M17 3v3M4.5 8.5h15M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 12.5h3v3H8z',
  revenue: 'M4 8h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11M16.5 13.5h.5',
}

const clientTabs = computed<Tab[]>(() => [
  { key: 'home', to: '/', label: t('nav.tabs.client.home'), icon: 'home' },
  { key: 'requests', to: '/dashboard/client', label: t('nav.tabs.client.requests'), icon: 'requests', match: ['/demande', '/matching', '/formules', '/paiement'] },
  { key: 'messages', to: '/messages', label: t('nav.tabs.client.messages'), icon: 'messages' },
  { key: 'account', to: '/profil', label: t('nav.tabs.client.account'), icon: 'account', match: ['/favoris', '/parrainage', '/abonnement'] },
])

const providerTabs = computed<Tab[]>(() => [
  { key: 'today', to: '/prestataire/accueil', label: t('nav.tabs.provider.today'), icon: 'today', match: ['/prestataire/mission'] },
  { key: 'requests', to: '/prestataire/demandes', label: t('nav.tabs.provider.requests'), icon: 'requests' },
  { key: 'revenue', to: '/prestataire/solde', label: t('nav.tabs.provider.revenue'), icon: 'revenue', match: ['/solde', '/abonnement'] },
  { key: 'account', to: '/prestataire/profil', label: t('nav.tabs.provider.account'), icon: 'account', match: ['/profil'] },
])

const tabs = computed<Tab[]>(() => {
  if (user.value?.role === 'prestataire') return providerTabs.value
  if (user.value?.role === 'client') return clientTabs.value
  return []
})

function isActive(tab: Tab): boolean {
  if (tab.to === '/') return route.path === '/'
  if (route.path === tab.to || route.path.startsWith(`${tab.to}/`)) return true
  return (tab.match ?? []).some((p) => route.path === p || route.path.startsWith(`${p}/`))
}
</script>

<template>
  <nav
    v-if="tabs.length"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom);"
    :aria-label="t('nav.tabs.ariaLabel')"
  >
    <ul class="mx-auto flex max-w-md items-stretch">
      <li v-for="tab in tabs" :key="tab.key" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="press flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold"
          :class="isActive(tab) ? 'text-primary' : 'text-muted'"
          :aria-current="isActive(tab) ? 'page' : undefined"
          :aria-label="tabAriaLabel(tab)"
        >
          <span class="relative">
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="ICON_PATHS[tab.icon]" />
            </svg>
            <span
              v-if="badgeCount(tab) > 0"
              class="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-pill bg-error px-1 text-center text-[11px] font-bold leading-[18px] text-white"
              aria-hidden="true"
            >{{ badgeCount(tab) > 9 ? '9+' : badgeCount(tab) }}</span>
          </span>
          <span class="leading-none">{{ tab.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
