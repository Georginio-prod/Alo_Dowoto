import { THEME_STORAGE_KEY, type Theme } from '~/composables/useTheme'

/**
 * Applique le thème clair/sombre (#188) avant le montage de l'app pour
 * limiter le flash du mauvais thème : choix mémorisé de l'utilisateur en
 * priorité, sinon `prefers-color-scheme` à la première visite.
 * `enforce: 'pre'` fait tourner ce plugin avant les autres plugins client
 * (dont le rendu de l'app), donc `data-theme` est posé sur `<html>` avant
 * le premier paint du contenu.
 */
export default defineNuxtPlugin({
  name: 'theme-init',
  enforce: 'pre',
  setup() {
    const { setTheme } = useTheme()

    let stored: Theme | null = null
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY)
      if (raw === 'light' || raw === 'dark') stored = raw
    } catch {
      // Stockage indisponible (navigation privée, quota…) : on retombe
      // sur la préférence système ci-dessous.
    }

    if (stored) {
      setTheme(stored)
      return
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    setTheme(prefersDark ? 'dark' : 'light')
  },
})
