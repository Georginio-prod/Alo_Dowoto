import React from 'react'
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import { OfflineBanner } from './OfflineBanner'

export interface ScreenProps {
  children: React.ReactNode
  scroll?: boolean
  /** Contenu ancré en bas (tiers inférieur, actions à une main — Phase 4). */
  footer?: React.ReactNode
  padded?: boolean
  contentStyle?: ViewStyle
}

/**
 * Conteneur d'écran : zone sûre, fond de page, bandeau hors-ligne global,
 * option scroll et pied d'écran ancré (actions principales en bas).
 */
export function Screen({ children, scroll = true, footer, padded = true, contentStyle }: ScreenProps) {
  const theme = useTheme()
  const pad = padded ? { padding: theme.spacing.lg } : null

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.bg }]} edges={['top']}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { gap: theme.spacing.md }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, { gap: theme.spacing.md }, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.hairline },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
})
