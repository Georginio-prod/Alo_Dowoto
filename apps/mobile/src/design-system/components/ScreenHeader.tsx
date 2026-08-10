import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '../theme'
import { Text } from './Text'

export interface ScreenHeaderProps {
  title: string
  subtitle?: string
  /** Affiche la flèche retour (gère aussi le bouton physique Android via router). */
  back?: boolean
  right?: React.ReactNode
}

/** En-tête d'écran cohérent. */
export function ScreenHeader({ title, subtitle, back, right }: ScreenHeaderProps) {
  const theme = useTheme()
  return (
    <View style={[styles.wrap, { borderBottomColor: theme.colors.hairline }]}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[styles.backBtn, { minWidth: theme.touchTarget.min, minHeight: theme.touchTarget.min }]}
        >
          <Text variant="h2" color="ink">
            ←
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text variant="h2" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
})
