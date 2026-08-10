import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme'
import { Text } from './Text'
import { Button } from './Button'

/** État vide, pédagogique (Phase 4). */
export function EmptyState({
  title,
  message,
  glyph = '📭',
  actionLabel,
  onAction,
}: {
  title: string
  message?: string
  glyph?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.center}>
      <Text variant="h1" center>
        {glyph}
      </Text>
      <Text variant="h2" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="muted" center>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}

/** État d'erreur avec « Réessayer » (Phase 4) — jamais d'écran blanc. */
export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Réessayer',
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <View style={styles.center}>
      <Text variant="h1" center>
        ⚠️
      </Text>
      <Text variant="body" color="muted" center>
        {message}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}

/** Squelette de chargement (barres animées simples). */
export function Skeleton({ height = 16, width = '100%' as number | `${number}%` }) {
  const theme = useTheme()
  return (
    <View
      style={{
        height,
        width,
        borderRadius: theme.radii.field,
        backgroundColor: theme.colors.hairline,
        opacity: 0.6,
      }}
    />
  )
}

/** Bloc de plusieurs lignes squelette (liste). */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton height={56} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  action: { marginTop: 8 },
  skeletonWrap: { padding: 16, gap: 12 },
  skeletonRow: {},
})
