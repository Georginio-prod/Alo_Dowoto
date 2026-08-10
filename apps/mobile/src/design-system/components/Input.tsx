import React, { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface InputProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
  /** Ajoute un bouton « Afficher / Masquer » (mot de passe) — design-edo §1.4. */
  secureToggle?: boolean
}

/**
 * Champ de saisie avec libellé et message d'erreur. L'erreur n'est jamais
 * portée par la seule couleur : bordure + texte explicite.
 */
export function Input({ label, error, hint, style, secureToggle, secureTextEntry, ...rest }: InputProps) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isSecure = secureToggle ? !revealed : secureTextEntry

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.hairline

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="label" color="muted">
          {label}
        </Text>
        {secureToggle ? (
          <Pressable onPress={() => setRevealed((r) => !r)} hitSlop={8}>
            <Text variant="label" color="primary">
              {revealed ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        secureTextEntry={isSecure}
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
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12 },
  helper: { marginTop: 2 },
})
