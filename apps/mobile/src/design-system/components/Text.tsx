import React from 'react'
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native'
import { useTheme } from '../theme'
import type { TypographyVariant } from '../tokens'

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant
  color?: 'ink' | 'muted' | 'primary' | 'error' | 'onPrimary'
  center?: boolean
}

/**
 * Composant texte de base. Toute chaîne affichée passe par ici : garantit la
 * police Poppins, l'échelle typographique et les couleurs sémantiques.
 * `allowFontScaling` reste activé (défaut RN) pour respecter la taille de
 * police système (Phase 6, test police agrandie).
 */
export function Text({ variant = 'body', color = 'ink', center, style, ...rest }: TextProps) {
  const theme = useTheme()
  const colorValue =
    color === 'ink'
      ? theme.colors.ink
      : color === 'muted'
        ? theme.colors.muted
        : color === 'primary'
          ? theme.colors.primary
          : color === 'error'
            ? theme.colors.error
            : theme.colors.onPrimary

  const base: TextStyle = {
    ...theme.typography[variant],
    color: colorValue,
    ...(center ? { textAlign: 'center' } : null),
  }

  return <RNText style={[base, style]} {...rest} />
}
