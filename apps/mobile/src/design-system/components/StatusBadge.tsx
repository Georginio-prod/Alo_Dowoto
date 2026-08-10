import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface StatusBadgeProps {
  label: string
  tone?: BadgeTone
  /** Symbole/icône devant le libellé — l'info n'est jamais portée par la
   *  couleur seule (Phase 2). */
  glyph?: string
}

/** Badge de statut (missions escrow, vérification…). */
export function StatusBadge({ label, tone = 'neutral', glyph }: StatusBadgeProps) {
  const theme = useTheme()
  const color =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'danger'
          ? theme.colors.error
          : tone === 'info'
            ? theme.colors.info
            : theme.colors.muted

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, borderRadius: theme.radii.pill },
      ]}
      accessibilityLabel={label}
    >
      <Text variant="caption" style={{ color }}>
        {glyph ? `${glyph} ${label}` : label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
})
