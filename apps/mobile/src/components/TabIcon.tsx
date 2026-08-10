import React from 'react'
import { Text } from 'react-native'

/**
 * Icône d'onglet = emoji. TOUJOURS accompagnée de son libellé texte
 * (tabBarLabel), jamais d'icône seule (Phase 4).
 */
export function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>
}
