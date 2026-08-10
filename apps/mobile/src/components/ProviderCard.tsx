import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Avatar, Card, StatusBadge, Text, useTheme } from '@/design-system'
import type { Provider } from '@/features/providers'

/** Carte prestataire réutilisée en résultats, favoris, avant. */
export function ProviderCard({ provider, onPress }: { provider: Provider; onPress?: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const name = provider.name || `${provider.firstName} ${provider.lastName}`.trim() || '—'
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        <Avatar uri={provider.avatarUrl} name={name} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {name}
          </Text>
          {provider.sector ? (
            <Text variant="label" color="muted" numberOfLines={1}>
              {provider.sector}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            {provider.rating != null ? (
              <Text variant="caption" color="muted">
                ⭐ {provider.rating.toFixed(1)}
                {provider.reviewsCount != null
                  ? ` · ${t('provider.reviews', { count: provider.reviewsCount })}`
                  : ''}
              </Text>
            ) : null}
            {provider.distanceKm != null ? (
              <Text variant="caption" color="muted">
                📍 {t('results.distance', { km: provider.distanceKm.toFixed(1) })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {provider.verified ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" />
        </View>
      ) : null}
    </Card>
  )
}
