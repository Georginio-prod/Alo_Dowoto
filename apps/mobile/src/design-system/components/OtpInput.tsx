import React, { useRef } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

/**
 * Saisie d'un code à 6 chiffres façon design-edo (§1.3) : 6 cases distinctes.
 * Implémentation robuste : un seul TextInput invisible capte la frappe, les
 * cases n'affichent que le rendu — pas de gestion de focus multi-champ fragile.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
}) {
  const theme = useTheme()
  const ref = useRef<TextInput>(null)
  const digits = value.slice(0, length).split('')

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < digits.length
        const active = i === digits.length
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderRadius: theme.radii.field,
                backgroundColor: theme.colors.surface,
                borderColor: active ? theme.colors.primary : filled ? theme.colors.hairline : theme.colors.hairline,
                borderWidth: active ? 2 : 1,
              },
            ]}
          >
            <Text variant="h1" style={{ fontSize: 24 }}>
              {digits[i] ?? ''}
            </Text>
          </View>
        )
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: { flex: 1, aspectRatio: 0.85, alignItems: 'center', justifyContent: 'center', maxHeight: 60 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
})
