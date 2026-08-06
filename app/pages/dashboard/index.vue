<script setup lang="ts">
/**
 * Dashboard unifié « Mon espace » (cible mobile / APK, voir mobile/).
 *
 * Fusionne en UNE seule route role-aware les deux tableaux de bord jusqu'ici
 * séparés — chercheur (app/pages/dashboard/client.vue, layout `blank`) et
 * prestataire (app/pages/prestataire/index.vue, layout `dashboard-prestataire`
 * à barre latérale). L'utilisateur connecté ne voit donc qu'un seul écran
 * cohérent et scrollable adapté à son rôle.
 *
 * Ne modifie ni ne remplace les pages existantes : elle réutilise exactement
 * les mêmes API et clés i18n. Cette page ne porte que la coquille commune
 * (en-tête, aiguillage de rôle, barre d'onglets) ; le corps de chaque rôle vit
 * dans son propre composant, qui n'est monté — et ne déclenche donc ses appels
 * API — que pour ce rôle.
 *
 * Mise en page alignée sur la maquette « WorkTogo — App mobile, de A à Z »
 * (écrans 2.1 « Accueil client » et 6.1 « Tableau de bord prestataire »).
 */

definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user } = useSession()

// Rôle connu dès le setup : le middleware `auth` a déjà résolu la session
// (refresh) avant le rendu de la page.
const isProvider = computed(() => user.value?.role === 'prestataire')

// Accueil à l'inscription (#tutoriel-onboarding — Couche 1). Affiché au premier
// passage sur l'accueil de l'app. Rendu uniquement côté client (après lecture
// de localStorage) pour éviter tout décalage d'hydratation.
const {
  shouldShowWelcome,
  shouldShowBanner,
  load: loadOnboarding,
  completeWelcome,
  postponeWelcome,
  engageBanner,
  refuseBanner,
} = useOnboarding()

const { t } = useI18n({ useScope: 'global' })

const onboardingReady = ref(false)

const canOnboard = computed(() => ['client', 'prestataire'].includes(user.value?.role ?? ''))
const showWelcome = computed(() => onboardingReady.value && canOnboard.value && shouldShowWelcome.value)
const showBanner = computed(() => onboardingReady.value && canOnboard.value && shouldShowBanner.value)

// Le tutoriel complet (Couche 3, page dédiée) arrive dans un incrément suivant ;
// on renvoie pour l'instant vers la page d'aide existante.
function onWelcomeComplete() {
  completeWelcome()
  navigateTo('/aide')
}
function onBannerOpen() {
  engageBanner()
  navigateTo('/aide')
}

// --- Tutoriel contextuel de l'accueil chercheur (#tutoriel-onboarding — Couche 2) ---
const tutorials = useTutorials()
const DASH_SECTION = 'dashboard-seeker'
const tourActive = ref(false)
const dashboardTourSteps = computed(() => [
  { target: '[data-tour="dash-search"]', title: t('dashboardTour.search.title'), text: t('dashboardTour.search.text') },
  { target: '[data-tour="dash-sectors"]', title: t('dashboardTour.sectors.title'), text: t('dashboardTour.sectors.text') },
  { target: '[data-tour="app-tabs"]', title: t('dashboardTour.tabs.title'), text: t('dashboardTour.tabs.text') },
])

function maybeAutoStartTour() {
  if (!onboardingReady.value || showWelcome.value) return
  if (user.value?.role !== 'client') return // section prestataire : incrément suivant
  if (tutorials.hasSeen(DASH_SECTION) || !tutorials.canAutoStart()) return
  tutorials.noteAutoStarted()
  tourActive.value = true
}
function replayTour() {
  tourActive.value = true
}
function endTour() {
  tutorials.markSeen(DASH_SECTION)
  tourActive.value = false
}

onMounted(() => {
  loadOnboarding()
  tutorials.load()
  onboardingReady.value = true
  maybeAutoStartTour()
})
// Fermer l'accueil de bienvenue rend la section éligible au tutoriel contextuel.
watch(showWelcome, (visible) => {
  if (!visible) maybeAutoStartTour()
})
</script>

<template>
  <div class="mx-auto max-w-[720px] px-5 pb-28 pt-6 lg:pb-8">
    <!-- Ce <div> doit rester l'unique nœud racine (transitions de page Nuxt) :
         même un commentaire placé avant lui compte pour un second nœud.
         `pb-28` dégage la hauteur de MobileTabBar (fixe) pour que le dernier
         bloc reste atteignable au scroll.

         En-tête commun aux deux rôles : le solde n'est jamais à plus d'un
         geste côté chercheur (côté prestataire il vit dans la carte encre). -->
    <header class="mb-6 flex items-center justify-between gap-3">
      <NuxtLink to="/dashboard" class="text-[19px] font-extrabold text-dark">
        Work<span class="text-primary">Togo</span>
      </NuxtLink>
      <div class="flex items-center gap-1.5">
        <WalletBalanceChip v-if="!isProvider" />
        <button
          v-if="!isProvider"
          type="button"
          class="press grid size-9 place-items-center rounded-pill text-muted hover:text-dark"
          :aria-label="t('dashboardTour.help')"
          @click="replayTour"
        >
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 16.5h.01" />
          </svg>
        </button>
        <NotificationBell />
      </div>
    </header>

    <OnboardingBanner v-if="showBanner" @open="onBannerOpen" @dismiss="refuseBanner" />

    <DashboardProviderHome v-if="isProvider" />
    <DashboardSeekerHome v-else />

    <MobileTabBar :role="user?.role" />

    <OnboardingWelcome
      v-if="showWelcome"
      :role="user?.role"
      @complete="onWelcomeComplete"
      @postpone="postponeWelcome"
    />

    <CoachmarkTour
      v-if="tourActive"
      :steps="dashboardTourSteps"
      @finish="endTour"
      @skip="endTour"
    />
  </div>
</template>
