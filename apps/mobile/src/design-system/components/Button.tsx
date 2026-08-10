import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../theme'
import { palette } from '../tokens'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  /** Icône optionnelle — mais un bouton a TOUJOURS un libellé texte (Phase 4). */
  icon?: React.ReactNode
  fullWidth?: boolean
  /** Retour haptique léger à la confirmation (Phase 4). */
  haptic?: boolean
  testID?: string
}

/**
 * Bouton unique de l'app (4 variantes × 5 états : normal, pressed, disabled,
 * loading, focus). Remplace les multiples styles de bouton du web par un seul.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  haptic = false,
  testID,
}: ButtonProps) {
  const theme = useTheme()
  const isDisabled = disabled || loading

  const handlePress = () => {
    if (isDisabled) return
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onPress?.()
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: theme.radii.pill, minHeight: theme.touchTarget.min },
        fullWidth && styles.fullWidth,
        variantStyle(theme, variant, pressed),
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={textColor(theme, variant)} />
        ) : (
          <>
            {icon}
            <Text variant="bodyBold" style={{ color: textColor(theme, variant) }}>
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  )
}

function variantStyle(
  theme: ReturnType<typeof useTheme>,
  variant: ButtonVariant,
  pressed: boolean,
): ViewStyle {
  const c = theme.colors
  switch (variant) {
    case 'primary':
      return { backgroundColor: pressed ? c.primaryHover : c.primary }
    case 'secondary':
      return {
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.hairline,
        ...(pressed ? { backgroundColor: c.bg } : null),
      }
    case 'ghost':
      return { backgroundColor: pressed ? c.hairline : 'transparent' }
    case 'danger':
      return { backgroundColor: pressed ? c.error : c.error, opacity: pressed ? 0.85 : 1 }
  }
}

function textColor(theme: ReturnType<typeof useTheme>, variant: ButtonVariant): string {
  const c = theme.colors
  if (variant === 'primary') return c.onPrimary
  if (variant === 'danger') return palette.white
  return c.ink
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 24, paddingVertical: 12, justifyContent: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
})
