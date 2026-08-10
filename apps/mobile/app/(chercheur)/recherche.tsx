import React, { useMemo, useState } from 'react'
import { Pressable, Switch, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Icon, Input, Screen, Sheet, Text, useTheme } from '@/design-system'
import { SECTORS } from '@/data/sectors'
import { useProviderSearch } from '@/features/providers'
import { ProviderCard } from '@/components/ProviderCard'
import { QueryState } from '@/components/QueryState'

const DISTANCES = [2, 5, 10, 25] as const
const RATINGS = [0, 3, 4, 4.5] as const

/** Recherche géolocalisée + feuille de filtres (design-edo §2.3/§2.4). */
export default function Recherche() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [q, setQ] = useState('')
  const [sector, setSector] = useState<string | undefined>()
  const [submitted, setSubmitted] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [maxDistance, setMaxDistance] = useState<number>(10)
  const [minRating, setMinRating] = useState<number>(0)

  const search = useProviderSearch({ q, sector, radius: maxDistance }, submitted)

  const filtered = useMemo(() => {
    const list = search.data?.providers ?? []
    return list.filter(
      (p) =>
        (!verifiedOnly || p.verified) &&
        (minRating === 0 || (p.rating ?? 0) >= minRating) &&
        (p.distanceKm == null || p.distanceKm <= maxDistance),
    )
  }, [search.data, verifiedOnly, minRating, maxDistance])

  const run = () => setSubmitted(true)

  return (
    <Screen>
      <Text variant="h1">{t('tabs.search')}</Text>

      <View style={styles(theme).searchBar}>
        <Icon name="search" size={18} color={theme.colors.muted} />
        <View style={{ flex: 1 }}>
          <Input
            label=""
            value={q}
            onChangeText={setQ}
            placeholder={t('home.searchPlaceholder')}
            returnKeyType="search"
            onSubmitEditing={run}
            style={{ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, minHeight: 40 }}
          />
        </View>
      </View>

      {/* Rangée de chips filtres */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        <FilterChip icon="sliders" label="Filtres" onPress={() => setShowFilters(true)} />
        <FilterChip label="Vérifiés" active={verifiedOnly} onPress={() => { setVerifiedOnly((v) => !v); run() }} />
        <FilterChip label={`≤ ${maxDistance} km`} onPress={() => setShowFilters(true)} />
        <FilterChip
          label="Carte"
          onPress={() => router.push({ pathname: '/carte', params: { sector: sector ?? '', q } })}
        />
      </View>

      {/* Chips secteur */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {SECTORS.map((s) => {
          const active = s.slug === sector
          return (
            <Pressable
              key={s.slug}
              onPress={() => { setSector(active ? undefined : s.slug); run() }}
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
          data={filtered}
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
                <ProviderCard key={p.id} provider={p} onPress={() => router.push(`/prestataire/${p.id}`)} />
              ))}
            </View>
          )}
        </QueryState>
      ) : (
        <Card>
          <Text color="muted">{t('home.searchPlaceholder')}</Text>
        </Card>
      )}

      {/* Feuille de filtres */}
      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title="Filtres">
        <Text variant="bodyBold">Distance autour de moi</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          {DISTANCES.map((d) => (
            <Choice key={d} label={`${d} km`} active={maxDistance === d} onPress={() => setMaxDistance(d)} />
          ))}
        </View>
        <Text variant="bodyBold">Note minimale</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          {RATINGS.map((r) => (
            <Choice key={r} label={r === 0 ? 'Toutes' : `★ ${r}+`} active={minRating === r} onPress={() => setMinRating(r)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <Text variant="bodyBold">Identité vérifiée</Text>
          <Switch
            value={verifiedOnly}
            onValueChange={setVerifiedOnly}
            trackColor={{ true: theme.colors.primary, false: theme.colors.hairline }}
          />
        </View>
        <Button label="Voir les résultats" onPress={() => { setShowFilters(false); run() }} haptic />
      </Sheet>
    </Screen>
  )
}

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon?: 'sliders'
  active?: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.hairline,
        backgroundColor: active ? theme.tints.success.bg : theme.colors.surface,
      }}
    >
      {icon ? <Icon name={icon} size={14} color={active ? theme.colors.primary : theme.colors.muted} /> : null}
      <Text variant="caption" style={{ color: active ? theme.colors.primary : theme.colors.ink }}>
        {label}
      </Text>
    </Pressable>
  )
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radii.field,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.hairline,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
      }}
    >
      <Text variant="caption" style={{ color: active ? theme.colors.onPrimary : theme.colors.ink }}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = (theme: ReturnType<typeof useTheme>) => ({
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderRadius: theme.radii.field,
    paddingHorizontal: 14,
  },
})
