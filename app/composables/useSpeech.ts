/**
 * Narration vocale des tutoriels (#tutoriel-onboarding — Partie F).
 *
 * S'appuie sur la synthèse vocale du système (Web Speech API — `speechSynthesis`,
 * intégrée, aucune dépendance) : rend les tutoriels utilisables par quelqu'un qui
 * lit difficilement. État actif/inactif mémorisé (localStorage). Silencieux si le
 * navigateur ne supporte pas l'API (dégradation propre, le texte reste lisible).
 *
 * Évolutif : `speak()` pourra plus tard jouer des enregistrements réels (fichiers
 * audio par clé i18n) sans changer les appelants — voir docs/tutoriel-audio.
 */
const STORAGE_KEY = 'wt_speech_v1'

export function useSpeech() {
  const enabled = useState<boolean>('speech-enabled', () => false)
  const supported = computed(() => import.meta.client && 'speechSynthesis' in window)

  function load() {
    if (!import.meta.client) return
    try {
      enabled.value = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // localStorage indisponible : narration désactivée par défaut.
    }
  }

  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, enabled.value ? '1' : '0')
    } catch {
      // Sans effet bloquant.
    }
  }

  function stop() {
    if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  /** Lit un texte à voix haute si la narration est activée et supportée. */
  function speak(text: string, lang = 'fr-FR') {
    if (!enabled.value || !supported.value || !text) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.98
      window.speechSynthesis.speak(utterance)
    } catch {
      // Échec de synthèse : sans effet, le texte reste affiché.
    }
  }

  function toggle() {
    enabled.value = !enabled.value
    persist()
    if (!enabled.value) stop()
  }

  return { enabled, supported, load, speak, stop, toggle }
}
