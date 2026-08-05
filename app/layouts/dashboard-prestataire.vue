<script setup lang="ts">
/**
 * Socle de navigation du dashboard prestataire (#37).
 *
 * Point d'extension pour les futures sections (Avis) : ajouter une route
 * réelle à l'entrée ici suffit, sans toucher aux pages existantes.
 */
interface NavItem {
  label: string
  to: string | null
  activePaths?: string[]
}

const { t } = useI18n({ useScope: 'global' })

const NAV_ITEM_CLASSES = {
  active: 'bg-primary/10 text-primary',
  inactive: 'press text-muted hover:bg-bg hover:text-dark',
  disabled: 'cursor-not-allowed text-muted/60',
}

// Sous-pages du profil accessibles en lien direct (marque-page) plutôt que
// depuis une fenêtre du hub /profil (#hub-profil-modales) — elles doivent
// quand même faire ressortir l'entrée « Profil » de la nav, sinon rien ne
// s'allume alors qu'on est bien dans cette section.
const PROFILE_SUBPAGES = [
  '/prestataire/profil-professionnel',
  '/prestataire/cv',
  '/prestataire/langues',
  '/prestataire/formation',
  '/prestataire/certifications',
  '/prestataire/preferences',
  '/prestataire/coordonnees',
]

// La nav pointe vers les alias sous /prestataire/… (voir `alias` dans
// definePageMeta de prestataire/index.vue, profil.vue et messages/index.vue)
// pour que l'URL reflète toujours « section prestataire » — /prestataire,
// /profil et /messages restent aussi valides (liens externes, redirections
// de connexion) et sont donc gardés dans `activePaths` pour ne pas casser
// la surbrillance si on y arrive par un autre chemin.
const NAV_ITEMS = computed<NavItem[]>(() => [
  { label: t('dashboardPrestataireLayout.navHome'), to: '/prestataire/accueil', activePaths: ['/prestataire'] },
  { label: t('dashboardPrestataireLayout.navProfile'), to: '/prestataire/profil', activePaths: ['/profil', ...PROFILE_SUBPAGES] },
  { label: t('dashboardPrestataireLayout.navRequests'), to: '/prestataire/demandes' },
  { label: t('dashboardPrestataireLayout.navBalance'), to: '/prestataire/solde' },
  { label: t('dashboardPrestataireLayout.navMessages'), to: '/prestataire/messages', activePaths: ['/messages'] },
  { label: t('dashboardPrestataireLayout.navReviews'), to: null },
])

const route = useRoute()

// Compteur de demandes reçues pour le badge de la barre d'onglets mobile
// (#refonte-ux-mobile) : l'onglet « Demandes » est le gagne-pain du
// prestataire, il doit être impossible à manquer. `lazy` pour ne pas bloquer
// la navigation — le badge se remplit dès que la donnée arrive.
const { data: receivedData } = useFetch<{ matches: unknown[] }>('/api/requests/received', {
  lazy: true,
  default: () => ({ matches: [] }),
})
const pendingRequestsCount = computed(() => receivedData.value?.matches?.length ?? 0)

function isActive(item: NavItem): boolean {
  return item.to === route.path || !!item.activePaths?.includes(route.path)
}

// Ce layout (contrairement à `default.vue`) n'inclut jamais AppHeader, donc
// jamais AccountMenu.vue — une fois dans la section prestataire, il n'y
// avait aucun moyen de se déconnecter sans en sortir d'abord (#333). Même
// logique que AccountMenu.vue::confirmLogout, dupliquée ici faute d'un point
// d'extraction commun qui vaille la peine pour un seul appelant de plus.
const { clear: clearSession } = useSession()
const confirmingLogout = ref(false)
const isLoggingOut = ref(false)

async function logout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/session', { method: 'DELETE' })
    clearSession()
  } finally {
    isLoggingOut.value = false
    confirmingLogout.value = false
    navigateTo('/')
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg text-ink pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
    <div class="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start">
      <aside class="w-full shrink-0 lg:w-[220px]">
        <NuxtLink to="/prestataire/accueil" class="mb-5 block text-[19px] font-extrabold text-dark">
          Work<span class="text-primary">Togo</span>
        </NuxtLink>

        <!-- Nav en pastilles : masquée sur mobile (barre d'onglets basse à la
             place, #refonte-ux-mobile), sidebar verticale sur desktop. -->
        <nav class="hidden gap-1.5 overflow-x-auto rounded-card border border-hairline bg-surface p-2 shadow-card-sm lg:flex lg:flex-col lg:overflow-visible">
          <template v-for="item in NAV_ITEMS" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="whitespace-nowrap rounded-field px-3.5 py-2.5 text-[13.5px] font-semibold"
              :class="isActive(item) ? NAV_ITEM_CLASSES.active : NAV_ITEM_CLASSES.inactive"
            >
              {{ item.label }}
            </NuxtLink>
            <span
              v-else
              class="whitespace-nowrap rounded-field px-3.5 py-2.5 text-[13.5px] font-semibold"
              :class="NAV_ITEM_CLASSES.disabled"
              aria-disabled="true"
            >
              {{ item.label }} <span class="text-[11px] font-normal">{{ t('dashboardPrestataireLayout.soon') }}</span>
            </span>
          </template>
        </nav>

        <div class="mt-4 rounded-card border border-hairline bg-surface p-2 shadow-card-sm">
          <div v-if="confirmingLogout" class="p-1.5">
            <p class="mb-2 px-1.5 text-[12.5px] text-dark">{{ t('dashboardPrestataireLayout.confirmLogoutQuestion') }}</p>
            <div class="flex gap-2">
              <button
                type="button"
                class="press flex-1 rounded-field bg-error py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                :disabled="isLoggingOut"
                @click="logout"
              >
                {{ isLoggingOut ? t('dashboardPrestataireLayout.loggingOut') : t('dashboardPrestataireLayout.confirm') }}
              </button>
              <button
                type="button"
                class="press flex-1 rounded-field border border-hairline bg-white py-1.5 text-[12.5px] font-semibold text-muted"
                @click="confirmingLogout = false"
              >
                {{ t('dashboardPrestataireLayout.cancel') }}
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="press block w-full rounded-field px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-error hover:bg-error/10"
            @click="confirmingLogout = true"
          >
            {{ t('dashboardPrestataireLayout.logout') }}
          </button>
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>

    <MobileTabBar :badges="{ requests: pendingRequestsCount }" />
  </div>
</template>
