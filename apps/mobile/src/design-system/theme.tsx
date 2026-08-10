import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import {
  darkColors,
  lightColors,
  radii,
  shadows,
  spacing,
  touchTarget,
  typography,
  motion,
  type ColorScheme,
} from './tokens'

export interface Theme {
  colors: ColorScheme
  spacing: typeof spacing
  radii: typeof radii
  shadows: typeof shadows
  typography: typeof typography
  touchTarget: typeof touchTarget
  motion: typeof motion
  isDark: boolean
}

const ThemeContext = createContext<Theme | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radii,
      shadows,
      typography,
      touchTarget,
      motion,
      isDark,
    }),
    [isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Accès au thème courant. Toujours utiliser ceci — jamais de couleur en dur. */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return ctx
}
