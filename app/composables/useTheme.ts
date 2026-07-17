export interface ThemeOption {
  id: string
  label: string
  /** Couleur repère affichée dans le bouton (pastille). */
  dot: string
}

/** Thème clair par défaut (aucun attribut data-theme sur <html>). */
const CLAIR: ThemeOption = { id: 'clair', label: 'Clair', dot: '#14A800' }

/**
 * Thèmes disponibles, dans l'ordre de bascule du bouton. Les 4 thèmes sombres
 * sont définis (variables CSS) dans app/assets/css/themes.css.
 */
export const THEMES: ThemeOption[] = [
  CLAIR,
  { id: 'whatsapp', label: 'WhatsApp', dot: '#1FC98C' },
  { id: 'darkmatter', label: 'Darkmatter', dot: '#E68A4E' },
  { id: 'northern', label: 'Northern Lights', dot: '#38C15E' },
  { id: 'harbor', label: 'Harbor Steel', dot: '#C4A03A' },
]

const STORAGE_KEY = 'wt-theme'

/**
 * Gestion du thème de couleur : état partagé, application sur `<html>`
 * (attribut `data-theme`) et persistance dans localStorage. Le thème est aussi
 * appliqué avant le premier rendu par un petit script inline (nuxt.config) pour
 * éviter tout flash au chargement.
 */
export function useTheme() {
  const themeId = useState<string>('wt-theme', () => CLAIR.id)

  function apply(id: string) {
    if (!import.meta.client) return
    const root = document.documentElement
    if (id === CLAIR.id) root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    }
    catch {
      // localStorage indisponible (navigation privée…) : on ignore.
    }
  }

  function setTheme(id: string) {
    const known = THEMES.some((theme) => theme.id === id) ? id : CLAIR.id
    themeId.value = known
    apply(known)
  }

  function cycle() {
    const index = THEMES.findIndex((theme) => theme.id === themeId.value)
    const next = THEMES[(index + 1) % THEMES.length] ?? CLAIR
    setTheme(next.id)
  }

  const current = computed(() => THEMES.find((theme) => theme.id === themeId.value) ?? CLAIR)

  return { themeId, current, THEMES, setTheme, cycle }
}
