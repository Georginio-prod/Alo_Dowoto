import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useFavorites } from '@/features/profile'
import { QueryState } from '@/components/QueryState'

/** Favoris chercheur (reprend favoris.vue). */
export default function Favoris() {
  const { t } = useTranslation()
  const theme = useTheme()
  const favorites = useFavorites()

  return (
    <Screen>
      <ScreenHeader title={t('provider.favorite')} back />
      <QueryState
        isLoading={favorites.isLoading}
        isError={favorites.isError}
        data={favorites.data?.favorites}
        onRetry={() => favorites.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('results.empty')}
        emptyGlyph="⭐"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((f) => (
              <Card key={f.providerId} onPress={() => router.push(`/prestataire/${f.providerId}`)}>
                <Text variant="bodyBold">{f.name ?? f.providerId}</Text>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
