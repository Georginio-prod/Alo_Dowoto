import React, { useState } from 'react'
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface InputProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
}

/**
 * Champ de saisie avec libellé et message d'erreur. L'erreur n'est jamais
 * portée par la seule couleur : bordure + texte explicite (Phase 2).
 */
export function Input({ label, error, hint, style, ...rest }: InputProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.hairline

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="muted" style={styles.label}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={theme.colors.muted}
        onFocus={(e) => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          rest.onBlur?.(e)
        }}
        accessibilityLabel={label}
        style={[
          styles.input,
          theme.typography.body,
          {
            color: theme.colors.ink,
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radii.field,
            minHeight: theme.touchTarget.min,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { marginBottom: 2 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  helper: { marginTop: 2 },
})
