import React from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Card, Screen, ScreenHeader, StatusBadge, Text, useTheme } from '@/design-system'
import { useProvider } from '@/features/providers'
import { QueryState } from '@/components/QueryState'

/** Profil prestataire / matching (reprend matching/[id].vue). */
export default function PrestataireProfil() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const provider = useProvider(id)

  return (
    <Screen
      footer={
        <Button
          label={t('provider.requestQuote')}
          onPress={() => router.push('/demande')}
          haptic
          testID="request-quote"
        />
      }
    >
      <ScreenHeader title={t('provider.public')} back />
      <QueryState
        isLoading={provider.isLoading}
        isError={provider.isError}
        data={provider.data?.provider}
        onRetry={() => provider.refetch()}
      >
        {(p) => {
          const name = p.name || `${p.firstName} ${p.lastName}`.trim() || '—'
          return (
            <View style={{ gap: theme.spacing.md }}>
              <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <Avatar uri={p.avatarUrl} name={name} size={80} />
                <Text variant="h2">{name}</Text>
                {p.sector ? (
                  <Text variant="label" color="muted">
                    {p.sector}
                  </Text>
                ) : null}
                {p.verified ? <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" /> : null}
              </View>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h2" color="primary">
                      ⭐ {p.rating?.toFixed(1) ?? '—'}
                    </Text>
                    <Text variant="caption" color="muted">
                      {t('provider.rating')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text variant="h2">{p.reviewsCount ?? 0}</Text>
                    <Text variant="caption" color="muted">
                      {t('provider.reviews', { count: p.reviewsCount ?? 0 })}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          )
        }}
      </QueryState>
    </Screen>
  )
}
