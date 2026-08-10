import React from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text, useTheme } from '@/design-system'
import { SECTORS } from '@/data/sectors'
import { useFeaturedProviders } from '@/features/providers'
import { useSessionStore } from '@/features/auth/store'
import { ProviderCard } from '@/components/ProviderCard'
import { QueryState } from '@/components/QueryState'

/** Accueil chercheur : bonjour, recherche, catégories, avant, CTA demande. */
export default function ChercheurHome() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const featured = useFeaturedProviders()

  return (
    <Screen>
      <Text variant="h1">{t('home.hello', { name: user?.firstName || '👋' })}</Text>

      <Pressable onPress={() => router.push('/(chercheur)/recherche')}>
        <Card padded elevation="sm">
          <Text color="muted">🔎 {t('home.searchPlaceholder')}</Text>
        </Card>
      </Pressable>

      <Button
        label={t('home.newRequest')}
        onPress={() => router.push('/demande')}
        haptic
        testID="cta-new-request"
      />

      <Text variant="h2" style={{ marginTop: theme.spacing.md }}>
        {t('home.categories')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {SECTORS.map((s) => (
          <Pressable
            key={s.slug}
            onPress={() => router.push(`/categories/${s.slug}`)}
            style={{
              width: '31%',
              minHeight: theme.touchTarget.min + 24,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.card,
              borderWidth: 1,
              borderColor: theme.colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing.sm,
              gap: 4,
            }}
          >
            <Text variant="h2">{s.emoji}</Text>
            <Text variant="caption" color="muted" center numberOfLines={2}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text variant="h2" style={{ marginTop: theme.spacing.md }}>
        {t('home.featured')}
      </Text>
      <QueryState
        isLoading={featured.isLoading}
        isError={featured.isError}
        data={featured.data?.providers}
        onRetry={() => featured.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('results.empty')}
        emptyGlyph="🔎"
      >
        {(providers) => (
          <View style={{ gap: theme.spacing.sm }}>
            {providers.slice(0, 5).map((p) => (
              <ProviderCard key={p.id} provider={p} onPress={() => router.push(`/prestataire/${p.id}`)} />
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
