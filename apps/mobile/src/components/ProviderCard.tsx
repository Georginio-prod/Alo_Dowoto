import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Card, Icon, StatusBadge, Text, useTheme } from '@/design-system'
import { formatFcfa } from '@/features/pricing/utils'
import { providerMeta, providerName, type Provider } from '@/features/providers'

/** Carte prestataire (design-edo §2.3) : note, distance, prix, CTA. */
export function ProviderCard({ provider, onPress }: { provider: Provider; onPress?: () => void }) {
  const { t } = useTranslation()
  const theme = useTheme()
  const name = providerName(provider)
  const meta = providerMeta(provider)

  return (
    <Card elevation="sm">
      {provider.featured ? (
        <View style={{ marginBottom: theme.spacing.sm }}>
          <StatusBadge label="TOP" tone="warning" glyph="★" />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Avatar uri={provider.photoUrl} name={name} size={52} />
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
              {provider.rating ? provider.rating.toFixed(1) : '—'}
            </Text>
            {provider.reviewCount != null ? (
              <Text variant="label" color="muted">
                ({t('provider.reviews', { count: provider.reviewCount })})
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
        {provider.priceFrom ? (
          <Text variant="label" color="muted">
            Dès{' '}
            <Text variant="label" color="ink" style={{ fontFamily: theme.typography.bodyBold.fontFamily }}>
              {formatFcfa(provider.priceFrom)}
            </Text>
          </Text>
        ) : (
          <View />
        )}
        <Button label="Voir le profil" variant="secondary" fullWidth={false} onPress={onPress} />
      </View>
    </Card>
  )
}
