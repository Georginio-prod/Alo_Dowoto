/**
 * Coupe la narration vocale (#tutoriel-onboarding — Partie F) dès que l'app
 * passe en arrière-plan ou se ferme : une voix qui continue quand l'écran est
 * éteint ou l'app masquée serait déroutante et consommerait pour rien.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client || !('speechSynthesis' in window)) return
  const cancel = () => window.speechSynthesis.cancel()
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel()
  })
  window.addEventListener('pagehide', cancel)
})
