import React from 'react'
import { View } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface AvatarProps {
  uri?: string | null
  name?: string
  size?: number
}

/** Avatar avec repli sur les initiales. Images via expo-image (cache disque). */
export function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const theme = useTheme()
  const initials = (name ?? '?')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const shared = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.hairline,
  }

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={shared}
        contentFit="cover"
        transition={200}
        accessibilityLabel={name}
      />
    )
  }
  return (
    <View style={[shared, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text variant="label" color="muted">
        {initials}
      </Text>
    </View>
  )
}
