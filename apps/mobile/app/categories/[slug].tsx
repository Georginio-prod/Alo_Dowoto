import React from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { findSector } from '@/data/sectors'
import { useProviderSearch } from '@/features/providers'
import { ProviderCard } from '@/components/ProviderCard'
import { QueryState } from '@/components/QueryState'

/** Catégorie détaillée : prestataires du secteur (reprend categories/[slug].vue). */
export default function CategorieDetail() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const sector = findSector(slug)
  const search = useProviderSearch({ sector: slug }, !!slug)

  return (
    <Screen>
      <ScreenHeader title={sector ? `${sector.emoji} ${sector.name}` : t('categories.title')} back />
      <QueryState
        isLoading={search.isLoading}
        isError={search.isError}
        data={search.data?.providers}
        onRetry={() => search.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('results.empty')}
        emptyGlyph={sector?.emoji ?? '🔎'}
      >
        {(providers) => (
          <View style={{ gap: theme.spacing.sm }}>
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} onPress={() => router.push(`/prestataire/${p.id}`)} />
            ))}
          </View>
        )}
      </QueryState>
      <Button label={t('home.newRequest')} variant="secondary" onPress={() => router.push('/demande')} />
    </Screen>
  )
}
