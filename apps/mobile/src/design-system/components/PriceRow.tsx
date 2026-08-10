import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface PriceRowProps {
  label: string
  value: string
  emphasis?: boolean
}

/** Ligne de prix (estimation, récapitulatif de paiement). */
export function PriceRow({ label, value, emphasis }: PriceRowProps) {
  const theme = useTheme()
  return (
    <View style={[styles.row, emphasis && { borderTopColor: theme.colors.hairline, borderTopWidth: 1, paddingTop: theme.spacing.sm }]}>
      <Text variant={emphasis ? 'bodyBold' : 'body'} color={emphasis ? 'ink' : 'muted'}>
        {label}
      </Text>
      <Text variant={emphasis ? 'h2' : 'body'} color={emphasis ? 'primary' : 'ink'}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
