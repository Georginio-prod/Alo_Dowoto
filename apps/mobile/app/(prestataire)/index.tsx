import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Card, Screen, StatusBadge, Text, useTheme } from '@/design-system'
import { useConversations } from '@/features/missions'
import { useReceivedRequests } from '@/features/requests/hooks'
import { escrowLabel, formatFcfa } from '@/features/pricing/utils'
import type { EscrowStatus } from '@/features/pricing/types'
import { useSessionStore } from '@/features/auth/store'
import { QueryState } from '@/components/QueryState'

/** « Aujourd'hui » prestataire : mission du jour + demandes en attente. */
export default function PrestataireToday() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const conversations = useConversations()
  const received = useReceivedRequests()

  const active = conversations.data?.conversations.filter(
    (c) => c.status === 'in_escrow' || c.status === 'delivered',
  )

  return (
    <Screen>
      <Text variant="h1">{t('home.hello', { name: user?.firstName || '👋' })}</Text>

      <Text variant="h2">{t('mission.today')}</Text>
      <QueryState
        isLoading={conversations.isLoading}
        isError={conversations.isError}
        data={active}
        onRetry={() => conversations.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('mission.none')}
        emptyGlyph="📅"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((c) => {
              const badge = escrowLabel((c.status ?? 'in_escrow') as EscrowStatus)
              return (
                <Card key={c.id} onPress={() => router.push(`/mission/${c.id}`)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodyBold">{c.counterpartName || '—'}</Text>
                    {c.amount != null ? <Text color="primary">{formatFcfa(c.amount)}</Text> : null}
                  </View>
                  <StatusBadge label={t(badge.key)} tone={badge.tone} glyph={badge.glyph} />
                </Card>
              )
            })}
          </View>
        )}
      </QueryState>

      <Text variant="h2" style={{ marginTop: theme.spacing.md }}>
        {t('requests.incoming')}
      </Text>
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
            {list.slice(0, 5).map((r) => (
              <Card key={r.id} onPress={() => router.push(`/(prestataire)/demandes`)}>
                <Text variant="bodyBold">{r.title}</Text>
                {r.budgetMax != null ? (
                  <Text variant="label" color="muted">
                    {formatFcfa(r.budgetMax)}
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
