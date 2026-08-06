/**
 * État des tutoriels contextuels (#tutoriel-onboarding — Couche 2).
 *
 * Deux responsabilités :
 *  - mémoriser quelles sections ont déjà été « visitées » (coach marks vus une
 *    seule fois par section et par utilisateur), en localStorage — la sync
 *    serveur (TutorialProgress) viendra sans réécriture ;
 *  - faire respecter la règle absolue « jamais deux tutoriels contextuels dans
 *    la même session » via un garde au niveau module (persistant tant que
 *    l'app n'est pas rechargée — SPA).
 */
const STORAGE_KEY = 'wt_tutorials_v1'

interface TutorialsState {
  /** Identifiants de section dont le coach mark a déjà été vu/passé. */
  seen: string[]
}

// Garde de session (niveau module) : un seul tutoriel contextuel démarré
// automatiquement par session. « Revoir » explicite n'est pas concerné.
let tourShownThisSession = false

export function useTutorials() {
  const state = useState<TutorialsState>('tutorials-state', () => ({ seen: [] }))

  function load() {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TutorialsState>
        state.value = { seen: Array.isArray(parsed.seen) ? parsed.seen : [] }
      }
    } catch {
      // Illisible : on repart d'un état vide, le tutoriel se reproposera.
    }
    // Local-first : on affiche immédiatement l'état local, puis on fusionne la
    // progression serveur si le réseau est là (non bloquant).
    void syncFromServer()
  }

  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // Écriture impossible : sans effet bloquant.
    }
  }

  /**
   * Fusionne la progression serveur dans l'état local (union) — un changement
   * de téléphone ne relance donc pas les tutoriels déjà vus ailleurs. Silencieux
   * hors ligne ou non connecté : le local fait foi.
   */
  async function syncFromServer() {
    if (!import.meta.client) return
    try {
      const { seen } = await $fetch<{ seen: string[] }>('/api/tutorials/progress')
      if (Array.isArray(seen) && seen.length) {
        const merged = Array.from(new Set([...state.value.seen, ...seen]))
        if (merged.length !== state.value.seen.length) {
          state.value = { seen: merged }
          persist()
        }
      }
    } catch {
      // Hors ligne / non connecté : on conserve l'état local.
    }
  }

  function hasSeen(sectionId: string): boolean {
    return state.value.seen.includes(sectionId)
  }

  function markSeen(sectionId: string) {
    if (!state.value.seen.includes(sectionId)) {
      state.value = { seen: [...state.value.seen, sectionId] }
      persist()
    }
    // Remontée serveur (fire-and-forget) : non bloquante, échoue en silence hors ligne.
    if (import.meta.client) {
      void $fetch('/api/tutorials/progress', { method: 'POST', body: { sectionId } }).catch(() => {})
    }
  }

  /** Vrai si aucun tutoriel contextuel n'a encore démarré automatiquement cette session. */
  function canAutoStart(): boolean {
    return !tourShownThisSession
  }

  /** À appeler juste avant de démarrer automatiquement un tutoriel contextuel. */
  function noteAutoStarted() {
    tourShownThisSession = true
  }

  function reset() {
    state.value = { seen: [] }
    persist()
  }

  return { state, load, hasSeen, markSeen, canAutoStart, noteAutoStarted, reset }
}
