/**
 * Émission d'événements analytiques (#tutoriel-onboarding — Partie H).
 *
 * L'app n'a pas (encore) de module d'analytique admin : on émet donc
 * « proprement » vers un hook standard `window.dataLayer` (style GTM) qu'un
 * outil réel pourra consommer plus tard, et on trace en console en dev. Aucun
 * appel réseau, aucune dépendance, aucune donnée personnelle.
 *
 * L'indicateur qui compte : le numéro d'étape où les gens abandonnent
 * (`*_abandon` avec `step`). Il dit exactement quelle explication est ratée.
 */
export function useAnalytics() {
  function track(event: string, props: Record<string, unknown> = {}) {
    if (!import.meta.client) return
    try {
      const payload = { event, ...props, ts: Date.now() }
      const w = window as unknown as { dataLayer?: unknown[] }
      if (Array.isArray(w.dataLayer)) w.dataLayer.push(payload)
      else if (import.meta.dev) console.debug('[analytics]', event, props)
    } catch {
      // L'analytique ne doit jamais casser l'expérience.
    }
  }

  return { track }
}
