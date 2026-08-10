import React from 'react'
import { Pressable, View } from 'react-native'
import { Icon, Text, useTheme, type IconName } from '@/design-system'

/** Ligne de menu (design-edo §7.1) — icône au trait, cible ≥ 48dp. */
export function MenuRow({
  icon,
  glyph,
  label,
  onPress,
  danger,
  right,
}: {
  icon?: IconName
  glyph?: string
  label: string
  onPress?: () => void
  danger?: boolean
  right?: React.ReactNode
}) {
  const theme = useTheme()
  const color = danger ? theme.colors.error : theme.colors.ink
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
      {icon ? (
        <Icon name={icon} size={19} color={danger ? theme.colors.error : theme.colors.muted} />
      ) : glyph ? (
        <Text variant="body">{glyph}</Text>
      ) : null}
      <Text variant="body" style={{ flex: 1, color }}>
        {label}
      </Text>
      {right ?? <Icon name="chevron-right" size={18} color={theme.colors.muted} />}
    </Pressable>
  )
}

export function MenuGroup({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: 8 }}>{children}</View>
}
