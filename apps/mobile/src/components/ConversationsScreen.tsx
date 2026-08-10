import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Card, Screen, StatusBadge, Text, useTheme } from '@/design-system'
import { useConversations } from '@/features/missions'
import { escrowLabel, formatFcfa } from '@/features/pricing/utils'
import type { EscrowStatus } from '@/features/pricing/types'
import { QueryState } from './QueryState'

/** Liste des conversations/missions — partagée chercheur & prestataire. */
export function ConversationsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const conversations = useConversations()

  return (
    <Screen>
      <Text variant="h1">{t('messages.title')}</Text>
      <QueryState
        isLoading={conversations.isLoading}
        isError={conversations.isError}
        data={conversations.data?.conversations}
        onRetry={() => conversations.refetch()}
        isEmpty={(d) => d.length === 0}
        emptyTitle={t('messages.empty')}
        emptyGlyph="💬"
      >
        {(list) => (
          <View style={{ gap: theme.spacing.sm }}>
            {list.map((c) => {
              const status = c.status as EscrowStatus | undefined
              const badge = status ? escrowLabel(status) : null
              return (
                <Card key={c.id} onPress={() => router.push(`/mission/${c.id}`)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                      {c.counterpartName || c.title || '—'}
                    </Text>
                    {c.amount != null ? (
                      <Text variant="label" color="primary">
                        {formatFcfa(c.amount)}
                      </Text>
                    ) : null}
                  </View>
                  {c.title ? (
                    <Text variant="label" color="muted" numberOfLines={1}>
                      {c.title}
                    </Text>
                  ) : null}
                  {badge ? (
                    <View style={{ marginTop: theme.spacing.xs }}>
                      <StatusBadge label={t(badge.key)} tone={badge.tone} glyph={badge.glyph} />
                    </View>
                  ) : null}
                </Card>
              )
            })}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
