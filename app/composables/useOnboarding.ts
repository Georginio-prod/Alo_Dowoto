/**
 * État d'onboarding (tutoriel animé, #tutoriel-onboarding — Couche 1).
 *
 * Persistance **locale** (localStorage) pour que l'accueil fonctionne hors
 * connexion et ne se relance pas à chaque visite. La synchronisation serveur
 * (modèle TutorialProgress, reprise inter-appareils) est un incrément suivant :
 * ce composable est écrit pour l'accueillir sans réécriture (état centralisé,
 * points d'entrée `load`/`persist`).
 *
 * `useState` partage la même ref réactive entre tous les appelants (bandeau
 * d'accueil + overlay de bienvenue).
 */
export interface OnboardingState {
  /** L'utilisateur a vu (ou passé) les 3 écrans de bienvenue. */
  welcomeSeen: boolean
  /** A choisi « Plus tard » / « Passer » : un bandeau de rappel discret peut s'afficher. */
  wantsLater: boolean
  /** Nombre de fois où le bandeau de rappel a été refermé — au-delà de 2, plus jamais affiché. */
  bannerRefusals: number
}

const STORAGE_KEY = 'wt_onboarding_v1'
const MAX_BANNER_REFUSALS = 2
const DEFAULT_STATE: OnboardingState = { welcomeSeen: false, wantsLater: false, bannerRefusals: 0 }

export function useOnboarding() {
  const state = useState<OnboardingState>('onboarding-state', () => ({ ...DEFAULT_STATE }))

  /** À appeler côté client (onMounted) pour hydrater depuis localStorage. */
  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) state.value = { ...DEFAULT_STATE, ...JSON.parse(raw) as Partial<OnboardingState> }
    } catch {
      // localStorage indisponible / JSON corrompu : on garde l'état par défaut.
    }
  }

  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // Écriture impossible (mode privé, quota) : sans effet, l'accueil se
      // réaffichera à la prochaine session — dégradation acceptable.
    }
  }

  const shouldShowWelcome = computed(() => !state.value.welcomeSeen)
  const shouldShowBanner = computed(
    () => state.value.welcomeSeen && state.value.wantsLater && state.value.bannerRefusals < MAX_BANNER_REFUSALS,
  )

  /** L'utilisateur lance le tutoriel complet : accueil terminé, pas de bandeau. */
  function completeWelcome() {
    state.value = { ...state.value, welcomeSeen: true, wantsLater: false }
    persist()
  }

  /** « Plus tard » / « Passer » : accueil marqué vu, bandeau de rappel activé. */
  function postponeWelcome() {
    state.value = { ...state.value, welcomeSeen: true, wantsLater: true }
    persist()
  }

  /** L'utilisateur ouvre le tutoriel depuis le bandeau : on cesse de le proposer. */
  function engageBanner() {
    state.value = { ...state.value, wantsLater: false }
    persist()
  }

  /** L'utilisateur referme le bandeau : au 2e refus il disparaît définitivement. */
  function refuseBanner() {
    state.value = { ...state.value, bannerRefusals: state.value.bannerRefusals + 1 }
    persist()
  }

  /** « Réinitialiser les tutoriels » (paramètres) — incrément suivant. */
  function reset() {
    state.value = { ...DEFAULT_STATE }
    persist()
  }

  return {
    state,
    load,
    shouldShowWelcome,
    shouldShowBanner,
    completeWelcome,
    postponeWelcome,
    engageBanner,
    refuseBanner,
    reset,
  }
}
