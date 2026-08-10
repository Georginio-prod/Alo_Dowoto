import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface StatusBadgeProps {
  label: string
  tone?: BadgeTone
  /** Symbole/icône devant le libellé — l'info n'est jamais portée par la
   *  couleur seule (accessibilité). */
  glyph?: string
  /** `filled` (défaut, design-edo) = pastille teintée pleine ; `outline` = contour. */
  variant?: 'filled' | 'outline'
}

/**
 * Pastille de statut (missions escrow, vérification…). Style « pastille pleine
 * teintée » du design system (ex. « En cours » ambre, « Vérifié » vert).
 */
export function StatusBadge({ label, tone = 'neutral', glyph, variant = 'filled' }: StatusBadgeProps) {
  const theme = useTheme()
  const tint = theme.tints[tone]

  if (variant === 'outline') {
    return (
      <View style={[styles.badge, { borderWidth: 1, borderColor: tint.fg, borderRadius: theme.radii.pill }]}>
        <Text variant="caption" style={{ color: tint.fg }}>
          {glyph ? `${glyph} ${label}` : label}
        </Text>
      </View>
    )
  }

  return (
    <View
      style={[styles.badge, { backgroundColor: tint.bg, borderRadius: theme.radii.pill }]}
      accessibilityLabel={label}
    >
      <Text variant="caption" style={{ color: tint.fg, fontFamily: theme.typography.bodyBold.fontFamily }}>
        {glyph ? `${glyph} ${label}` : label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 },
})
