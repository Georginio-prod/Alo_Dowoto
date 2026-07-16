export type Theme = 'light' | 'dark'

/** Exportée pour que `app/plugins/theme.client.ts` lise la même clé au démarrage. */
export const THEME_STORAGE_KEY = 'wt-theme'

/**
 * État de thème partagé (#188), sur le même modèle que `useSession` :
 * `useState` garde une seule ref réactive pour toute l'app (et le payload
 * SSR), donc `toggle()` appelé depuis le bouton de l'en-tête se répercute
 * partout instantanément, sans navigation ni remount.
 *
 * La détection initiale (choix mémorisé, sinon `prefers-color-scheme`) est
 * faite le plus tôt possible par `app/plugins/theme.client.ts`, avant le
 * montage de l'app, pour limiter le flash du mauvais thème. Ce composable
 * ne fait qu'appliquer/refléter l'état ensuite (ex. depuis le bouton de
 * bascule) et ne persiste que le choix explicite de l'utilisateur —
 * `setTheme` seul (détection initiale) ne réécrit pas le stockage, pour
 * continuer à suivre la préférence système tant que l'utilisateur n'a
 * rien choisi lui-même.
 */
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function setTheme(next: Theme) {
    theme.value = next
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', next)
    }
  }

  function toggle() {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (import.meta.client) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Stockage indisponible (navigation privée, quota…) : le thème
        // reste actif pour la session en cours, simplement non mémorisé.
      }
    }
  }

  return { theme, setTheme, toggle }
}
