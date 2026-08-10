import React from 'react'
import { View } from 'react-native'
import { Card, IconTile, Text, useTheme } from '@/design-system'
import type { Sector } from '@/data/sectors'

/** Carte de secteur : tuile colorée + nom + sous-titre (design-edo.html §2.1). */
export function SectorCard({ sector, onPress }: { sector: Sector; onPress?: () => void }) {
  const theme = useTheme()
  return (
    <Card onPress={onPress} elevation="sm" style={{ flex: 1 }}>
      <IconTile glyph={sector.emoji} color={sector.color} />
      <View style={{ marginTop: theme.spacing.md, gap: 2 }}>
        <Text variant="bodyBold" numberOfLines={1}>
          {sector.name}
        </Text>
        <Text variant="label" color="muted" numberOfLines={1}>
          {sector.hint}
        </Text>
      </View>
    </Card>
  )
}
