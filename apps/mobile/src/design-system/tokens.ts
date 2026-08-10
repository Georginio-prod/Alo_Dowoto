/**
 * SOURCE DE VÉRITÉ UNIQUE des jetons de design.
 *
 * Couleurs et rayons repris **à l'identique** de l'app Nuxt
 * (`app/assets/css/main.css` pour le clair, `themes.css` thème « northern »
 * pour le sombre). Aucune couleur, taille ou espacement ne doit être écrit en
 * dur ailleurs — tout passe par ce fichier (vérifié en Phase 6).
 */

export const palette = {
  // Vert de marque WorkTogo (main.css)
  primary: '#14A800',
  primaryHover: '#109300',
  dark: '#0F2318',
  darkHover: '#1A3A28',
  // Neutres — clair
  bg: '#F7F7F7',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#5C626E',
  hairline: 'rgba(15,35,24,0.08)',
  // États
  error: '#D64545',
  star: '#E6A700',
  white: '#FFFFFF',
  // Voile des modales / feuilles basses (scrim).
  scrim: 'rgba(15,35,24,0.45)',
  // Sombre — thème « northern » (themes.css)
  darkModePrimary: '#38C15E',
  darkModePrimaryHover: '#2FAD52',
  darkModeBg: '#1A2430',
  darkModeSurface: '#212D3B',
  darkModeInk: '#E6EDF3',
  darkModeMuted: '#8A97A6',
  darkModeHairline: 'rgba(230,237,243,0.10)',
  darkModeError: '#EA4B41',
} as const

/** Rôles sémantiques de couleur, résolus par thème. */
export interface ColorScheme {
  primary: string
  primaryHover: string
  onPrimary: string
  dark: string
  bg: string
  surface: string
  ink: string
  muted: string
  hairline: string
  error: string
  star: string
  // États sémantiques dérivés (jamais couleur seule : toujours doublés d'un
  // libellé/icône côté composant — voir StatusBadge).
  success: string
  warning: string
  info: string
}

export const lightColors: ColorScheme = {
  primary: palette.primary,
  primaryHover: palette.primaryHover,
  onPrimary: palette.white,
  dark: palette.dark,
  bg: palette.bg,
  surface: palette.surface,
  ink: palette.ink,
  muted: palette.muted,
  hairline: palette.hairline,
  error: palette.error,
  star: palette.star,
  success: palette.primary,
  warning: palette.star,
  info: palette.dark,
}

export const darkColors: ColorScheme = {
  primary: palette.darkModePrimary,
  primaryHover: palette.darkModePrimaryHover,
  onPrimary: palette.dark,
  dark: palette.darkModeInk,
  bg: palette.darkModeBg,
  surface: palette.darkModeSurface,
  ink: palette.darkModeInk,
  muted: palette.darkModeMuted,
  hairline: palette.darkModeHairline,
  error: palette.darkModeError,
  star: palette.star,
  success: palette.darkModePrimary,
  warning: palette.star,
  info: palette.darkModeInk,
}

/** Échelle d'espacement de 4 (Phase 2). Aucune autre valeur autorisée. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const

/** Rayons (design-edo.html : 16 / 12 / 10 / pilule). */
export const radii = {
  field: 10,
  tile: 12, // tuiles d'icône de secteur, petits blocs
  card: 16,
  pill: 999,
} as const

/**
 * Teintes de statut (pastilles pleines type « En cours », « Vérifié »,
 * « Litige ») : fond clair + texte foncé assorti — reprises du design system.
 */
export const tints = {
  neutral: { bg: '#EEF0F2', fg: '#5C626E' },
  success: { bg: '#E6F4E6', fg: '#0F7A00' },
  warning: { bg: '#FBEFC9', fg: '#8A6400' },
  danger: { bg: '#FBE3E3', fg: '#B22B2B' },
  info: { bg: '#E7EEF9', fg: '#1D4ED8' },
} as const

/**
 * Typographie — reprise du design system fourni (design-edo.html) :
 * Titre écran 800/28, Titre de section 600/17, Corps 400/14,5, Poppins.
 */
export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const

export const typography = {
  // Titre d'écran (« Vérifions votre numéro », « WorkTogo »)
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.extrabold },
  // Titre de section (« Secteurs », « Reprendre là où vous étiez »)
  h2: { fontSize: 17, lineHeight: 24, fontFamily: fontFamily.semibold },
  // Corps
  body: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.regular },
  bodyBold: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.semibold },
  // Libellés / secondaire
  label: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily.regular },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.medium },
} as const

export type TypographyVariant = keyof typeof typography

/** Ombres (main.css) — adaptées à l'API elevation/shadow RN. */
export const shadows = {
  sm: {
    shadowColor: '#0F2318',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F2318',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F2318',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
} as const

/** Cibles tactiles : 48dp minimum (Phase 2). */
export const touchTarget = { min: 48 } as const

/** Motion : 200ms micro, 300ms transitions, courbe d'entrée imposée. */
export const motion = {
  micro: 200,
  screen: 300,
  easeIn: [0.05, 0.7, 0.1, 1] as const,
} as const
