import React from 'react'
import { Pressable, View } from 'react-native'
import { Text, useTheme } from '@/design-system'

/** Ligne de menu (paramètres, profil) — cible tactile ≥ 48dp. */
export function MenuRow({
  glyph,
  label,
  onPress,
  danger,
  right,
}: {
  glyph: string
  label: string
  onPress?: () => void
  danger?: boolean
  right?: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: theme.touchTarget.min,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.field,
        borderWidth: 1,
        borderColor: theme.colors.hairline,
      }}
    >
      <Text variant="body">{glyph}</Text>
      <Text variant="body" style={{ flex: 1, color: danger ? theme.colors.error : theme.colors.ink }}>
        {label}
      </Text>
      {right ?? <Text color="muted">›</Text>}
    </Pressable>
  )
}

export function MenuGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: 8 }}>{children}</View>
}
