import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Card, Input, Screen, Text, useTheme } from '@/design-system'
import { SECTORS } from '@/data/sectors'
import { useProviderSearch } from '@/features/providers'
import { ProviderCard } from '@/components/ProviderCard'
import { QueryState } from '@/components/QueryState'

/** Recherche géolocalisée : requête texte + filtre secteur + résultats. */
export default function Recherche() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [q, setQ] = useState('')
  const [sector, setSector] = useState<string | undefined>()
  const [submitted, setSubmitted] = useState(false)

  const search = useProviderSearch({ q, sector }, submitted)

  return (
    <Screen>
      <Text variant="h1">{t('tabs.search')}</Text>
      <Input
        label={t('common.search')}
        value={q}
        onChangeText={setQ}
        placeholder={t('home.searchPlaceholder')}
        returnKeyType="search"
        onSubmitEditing={() => setSubmitted(true)}
        // Innovation : recherche vocale — bouton micro branché plus tard sur
        // expo-speech-recognition (Phase 5, listée au rapport).
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {SECTORS.map((s) => {
          const active = s.slug === sector
          return (
            <Pressable
              key={s.slug}
              onPress={() => {
                setSector(active ? undefined : s.slug)
                setSubmitted(true)
              }}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: active ? theme.colors.primary : theme.colors.hairline,
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
              }}
            >
              <Text variant="caption" style={{ color: active ? theme.colors.onPrimary : theme.colors.ink }}>
                {s.emoji} {s.name}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {submitted ? (
        <QueryState
          isLoading={search.isLoading}
          isError={search.isError}
          data={search.data?.providers}
          onRetry={() => search.refetch()}
          isEmpty={(d) => d.length === 0}
          emptyTitle={t('results.empty')}
          emptyGlyph="🔎"
        >
          {(providers) => (
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" color="muted">
                {t('results.count', { count: providers.length })}
              </Text>
              {providers.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onPress={() => router.push(`/prestataire/${p.id}`)}
                />
              ))}
            </View>
          )}
        </QueryState>
      ) : (
        <Card>
          <Text color="muted">{t('home.searchPlaceholder')}</Text>
        </Card>
      )}
    </Screen>
  )
}
