import React from 'react'
import { View } from 'react-native'
import { Text } from './Text'
import { useTheme } from '../theme'

/**
 * Tuile d'icône colorée (carré arrondi r12) contenant un emoji ou une icône —
 * motif récurrent du design system (secteurs, avatars d'action).
 */
export function IconTile({
  glyph,
  color,
  size = 48,
  child,
}: {
  glyph?: string
  color: string
  size?: number
  child?: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radii.tile,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {child ?? (
        <Text style={{ fontSize: size * 0.42 }} allowFontScaling={false}>
          {glyph}
        </Text>
      )}
    </View>
  )
}
