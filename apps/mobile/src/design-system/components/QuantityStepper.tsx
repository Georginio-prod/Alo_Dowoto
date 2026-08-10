import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
}

/** Sélecteur de quantité (ex. nombre d'heures/d'intervenants). */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: QuantityStepperProps) {
  const theme = useTheme()
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  const btn = {
    width: theme.touchTarget.min,
    height: theme.touchTarget.min,
    borderRadius: theme.radii.field,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Pressable accessibilityLabel="Diminuer" onPress={dec} disabled={value <= min} style={btn}>
        <Text variant="h2" color="ink">
          −
        </Text>
      </Pressable>
      <Text variant="bodyBold" style={styles.value}>
        {value}
      </Text>
      <Pressable accessibilityLabel="Augmenter" onPress={inc} disabled={value >= max} style={btn}>
        <Text variant="h2" color="ink">
          +
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  value: { minWidth: 32, textAlign: 'center' },
})
