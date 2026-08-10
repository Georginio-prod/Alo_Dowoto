import React from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Button,
  Card,
  Icon,
  PriceRow,
  Screen,
  ScreenHeader,
  StatusBadge,
  Text,
  useTheme,
} from '@/design-system'
import { providerName, useProvider } from '@/features/providers'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Fiche prestataire publique (design-edo §3.1) — données réelles de l'API. */
export default function PrestataireProfil() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const provider = useProvider(id)

  return (
    <Screen
      footer={
        <Button
          label="Demander cette prestation"
          onPress={() => router.push('/demande')}
          haptic
          testID="request-quote"
        />
      }
    >
      <ScreenHeader
        title={t('provider.public')}
        back
        right={<Icon name="heart" size={20} color={theme.colors.muted} />}
      />
      <QueryState
        isLoading={provider.isLoading}
        isError={provider.isError}
        data={provider.data?.provider}
        onRetry={() => provider.refetch()}
      >
        {(p) => {
          const name = providerName(p)
          const place = [p.quartier, p.city].filter(Boolean).join(', ')
          return (
            <View style={{ gap: theme.spacing.lg }}>
              {/* En-tête */}
              <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <Avatar uri={p.photoUrl} name={name} size={84} />
                <Text variant="h1" center style={{ fontSize: 24 }}>
                  {name}
                </Text>
                {p.subSector ? (
                  <Text variant="body" color="muted" center>
                    {p.subSector}
                    {place ? ` · ${place}` : ''}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                  {p.verified ? <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" /> : null}
                  {p.featured ? <StatusBadge label="Top pro" tone="warning" glyph="★" /> : null}
                </View>
              </View>

              {/* Statistiques réelles */}
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <Stat value={p.rating ? p.rating.toFixed(1) : '—'} label="Note" glyph="★" />
                  <Divider />
                  <Stat value={String(p.reviewCount ?? 0)} label="Avis" />
                  <Divider />
                  <Stat value={p.priceFrom ? formatFcfa(p.priceFrom) : '—'} label="À partir de" />
                </View>
              </Card>

              {/* Prestations & tarifs (l'API expose le tarif de départ) */}
              {p.priceFrom ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text variant="h2">Prestations & tarifs</Text>
                  <Card>
                    <PriceRow label={p.subSector || t('provider.contact')} value={`Dès ${formatFcfa(p.priceFrom)}`} />
                  </Card>
                </View>
              ) : null}

              {/* Zone d'intervention */}
              {place || p.distanceKm != null ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text variant="h2">Zone d’intervention</Text>
                  <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Icon name="map-pin" size={16} color={theme.colors.muted} />
                      <Text variant="label" color="muted" style={{ flex: 1 }}>
                        {place || '—'}
                        {p.distanceKm != null ? ` · ${p.distanceKm.toFixed(1)} km` : ''}
                      </Text>
                    </View>
                  </Card>
                </View>
              ) : null}
            </View>
          )
        }}
      </QueryState>
    </Screen>
  )
}

function Stat({ value, label, glyph }: { value: string; label: string; glyph?: string }) {
  const theme = useTheme()
  return (
    <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
      <Text variant="bodyBold" color="ink" style={{ fontSize: 17 }}>
        {glyph ? `${glyph} ` : ''}
        {value}
      </Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  )
}

function Divider() {
  const theme = useTheme()
  return <View style={{ width: 1, backgroundColor: theme.colors.hairline }} />
}
