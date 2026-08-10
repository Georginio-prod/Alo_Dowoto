import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Card, Icon, StatusBadge, Text, useTheme } from '@/design-system'
import { formatFcfa } from '@/features/pricing/utils'
import type { Provider } from '@/features/providers'

/** Carte prestataire (design-edo §2.3) : note, distance, prix, CTA. */
export function ProviderCard({ provider, onPress }: { provider: Provider; onPress?: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const name = provider.name || `${provider.firstName} ${provider.lastName}`.trim() || '—'
  const meta = [provider.sector, provider.location, provider.distanceKm != null ? `${provider.distanceKm.toFixed(1)} km` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card elevation="sm">
      {provider.featured ? (
        <View style={{ marginBottom: theme.spacing.sm }}>
          <StatusBadge label="TOP" tone="warning" glyph="★" />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Avatar uri={provider.avatarUrl} name={name} size={52} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </Text>
            {provider.verified ? <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" /> : null}
          </View>
          {meta ? (
            <Text variant="label" color="muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={13} color={theme.colors.star} />
            <Text variant="label" style={{ fontFamily: theme.typography.bodyBold.fontFamily }}>
              {provider.rating != null ? provider.rating.toFixed(1) : '—'}
            </Text>
            {provider.reviewsCount != null ? (
              <Text variant="label" color="muted">
                ({t('provider.reviews', { count: provider.reviewsCount })})
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: theme.spacing.md,
        }}
      >
        {provider.pricePerHour != null ? (
          <Text variant="label" color="muted">
            Dès{' '}
            <Text variant="label" color="ink" style={{ fontFamily: theme.typography.bodyBold.fontFamily }}>
              {formatFcfa(provider.pricePerHour)}
            </Text>
          </Text>
        ) : (
          <View />
        )}
        <Button label={t('provider.contact')} variant="secondary" fullWidth={false} onPress={onPress} />
      </View>
    </Card>
  )
}
