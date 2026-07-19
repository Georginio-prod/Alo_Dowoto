/**
 * Synchronise l'état réactif du thème avec la valeur persistée dès le
 * chargement client (le script inline de nuxt.config a déjà posé l'attribut
 * `data-theme` avant le premier rendu pour éviter le flash ; ici on met à jour
 * l'état pour que le bouton affiche le bon thème).
 */
export default defineNuxtPlugin(() => {
  const { setTheme } = useTheme()
  let saved = 'clair'
  try {
    saved = localStorage.getItem('wt-theme') || 'clair'
  }
  catch {
    // localStorage indisponible : on reste sur le thème clair.
  }
  setTheme(saved)
})
