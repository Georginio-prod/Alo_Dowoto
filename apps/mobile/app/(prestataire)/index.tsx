import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, StatusBadge, Text, useTheme } from '@/design-system'
import { useReceivedRequests } from '@/features/requests/hooks'
import { useSubscription } from '@/features/subscriptions'
import { useWallet } from '@/features/payments'
import { findPlan, formatFcfa } from '@/features/pricing/utils'
import { useSessionStore } from '@/features/auth/store'
import { QueryState } from '@/components/QueryState'

/** Tableau de bord prestataire (design-edo §6.1). */
export default function PrestataireToday() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const received = useReceivedRequests()
  const subscription = useSubscription()
  const wallet = useWallet()

  const sub = subscription.data?.subscription
  const plan = sub?.slug ? findPlan(sub.slug) : undefined
  const quota = plan?.requestsPerMonth ?? null
  const receivedCount = received.data?.requests.length ?? 0

  return (
    <Screen>
      {/* En-tête */}
      <View style={{ gap: 2 }}>
        <Text variant="h1">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'WorkTogo Pro'}</Text>
        <Text variant="label" color="muted" style={{ textTransform: 'capitalize' }}>
          {sub?.active && sub.slug ? `Formule ${sub.slug}` : t('subscription.none')}
        </Text>
      </View>

      {/* Cartes stats (données réelles) */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Card elevation="sm" style={{ flex: 1 }}>
          <Text variant="label" color="muted">
            {t('earnings.balance')}
          </Text>
          <Text variant="h2" color="primary">
            {formatFcfa(wallet.data?.balance ?? 0)}
          </Text>
        </Card>
        <Card elevation="sm" style={{ flex: 1 }}>
          <Text variant="label" color="muted">
            {t('requests.incoming')}
          </Text>
          <Text variant="h2">{receivedCount}</Text>
        </Card>
      </View>

      {/* Quota de demandes */}
      {quota != null ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
            <Text variant="label" color="muted">
              Quota de demandes
            </Text>
            <Text variant="label" style={{ fontFamily: theme.typography.bodyBold.fontFamily }}>
              {Math.min(receivedCount, quota)} / {quota} ce mois
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: theme.colors.hairline, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.min(100, (receivedCount / quota) * 100)}%`,
                height: 6,
                borderRadius: 999,
                backgroundColor: theme.colors.primary,
              }}
            />
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            <Button label="Voir les formules" variant="secondary" onPress={() => router.push('/abonnement')} />
          </View>
        </Card>
      ) : null}

      {/* Nouvelles demandes */}
      <Text variant="h2">{t('requests.incoming')}</Text>
      <QueryState
        isLoading={received.isLoading}
        isError={received.isError}
        data={received.data?.requests}
        onRetry={() => received.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('requests.empty')}
        emptyGlyph="📥"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((r) => (
              <Card key={r.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <Text variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {r.budgetMax != null ? (
                    <Text variant="bodyBold" color="primary">
                      {formatFcfa(r.budgetMax)}
                    </Text>
                  ) : null}
                </View>
                {r.location ? (
                  <Text variant="label" color="muted" numberOfLines={1}>
                    {r.location}
                  </Text>
                ) : null}
                {r.urgency ? (
                  <View style={{ marginTop: theme.spacing.xs }}>
                    <StatusBadge label={t(`request.urgency${cap(r.urgency)}`)} tone="info" />
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Button label={t('requests.detail')} variant="secondary" onPress={() => router.push('/(prestataire)/demandes')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={t('requests.accept')} haptic onPress={() => router.push('/(prestataire)/messages')} />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
