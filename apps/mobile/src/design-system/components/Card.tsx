import React from 'react'
import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export interface CardProps extends ViewProps {
  onPress?: () => void
  elevation?: 'sm' | 'md' | 'lg' | 'none'
  padded?: boolean
}

/** Carte de surface : rayon et ombre du design system. */
export function Card({
  children,
  onPress,
  elevation = 'sm',
  padded = true,
  style,
  ...rest
}: CardProps) {
  const theme = useTheme()
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    ...(padded ? { padding: theme.spacing.lg } : null),
    ...(elevation !== 'none' ? theme.shadows[elevation] : null),
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.9 }, style]}
      >
        {children}
      </Pressable>
    )
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  )
}
