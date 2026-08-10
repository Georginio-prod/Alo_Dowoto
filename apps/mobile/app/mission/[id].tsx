import React, { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Input,
  Screen,
  ScreenHeader,
  StatusBadge,
  Text,
  useTheme,
} from '@/design-system'
import {
  useConversation,
  useMessages,
  useMissionAction,
  useSendMessage,
} from '@/features/missions'
import { escrowLabel, formatFcfa } from '@/features/pricing/utils'
import type { EscrowStatus } from '@/features/pricing/types'
import { useSessionStore } from '@/features/auth/store'
import { getCurrentCoords } from '@/services/location'
import { QueryState } from '@/components/QueryState'

/**
 * Suivi de mission (conversation + escrow). Actions filtrées par rôle et par
 * statut, avec mise à jour optimiste. Cœur du parcours des deux côtés.
 */
export default function Mission() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSessionStore((s) => s.user?.role)
  const conversation = useConversation(id)
  const messages = useMessages(id)
  const send = useSendMessage(id)
  const [draft, setDraft] = useState('')

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input label="" value={draft} onChangeText={setDraft} placeholder={t('messages.placeholder')} />
          </View>
          <Button
            label={t('messages.send')}
            fullWidth={false}
            onPress={() => {
              if (draft.trim()) send.mutate(draft.trim(), { onSuccess: () => setDraft('') })
            }}
          />
        </View>
      }
    >
      <ScreenHeader title={t('mission.title')} back />
      <QueryState
        isLoading={conversation.isLoading}
        isError={conversation.isError}
        data={conversation.data?.conversation}
        onRetry={() => conversation.refetch()}
      >
        {(c) => {
          const status = (c.status ?? 'awaiting_payment') as EscrowStatus
          const badge = escrowLabel(status)
          return (
            <View style={{ gap: theme.spacing.md }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodyBold">{c.counterpartName || c.title || '—'}</Text>
                  <StatusBadge label={t(badge.key)} tone={badge.tone} glyph={badge.glyph} />
                </View>
                {c.amount != null ? (
                  <Text variant="h2" color="primary">
                    {formatFcfa(c.amount)}
                  </Text>
                ) : null}
                {c.location ? (
                  <Text variant="label" color="muted">
                    📍 {c.location}
                  </Text>
                ) : null}
              </Card>

              <MissionActions id={id} status={status} role={role} />

              {/* Fil de discussion */}
              <QueryState
                isLoading={messages.isLoading}
                isError={messages.isError}
                data={messages.data?.messages}
                onRetry={() => messages.refetch()}
                isEmpty={(d) => d.length === 0}
                emptyTitle={t('messages.empty')}
                emptyGlyph="💬"
              >
                {(list) => (
                  <View style={{ gap: theme.spacing.xs }}>
                    {list.map((m) => (
                      <View
                        key={m.id}
                        style={{
                          alignSelf: m.mine ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          backgroundColor: m.mine ? theme.colors.primary : theme.colors.surface,
                          borderRadius: theme.radii.card,
                          borderWidth: 1,
                          borderColor: theme.colors.hairline,
                          padding: theme.spacing.sm,
                        }}
                      >
                        <Text style={{ color: m.mine ? theme.colors.onPrimary : theme.colors.ink }}>
                          {m.body}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </QueryState>
            </View>
          )
        }}
      </QueryState>
    </Screen>
  )
}

/** Actions escrow contextuelles (rôle + statut). */
function MissionActions({
  id,
  status,
  role,
}: {
  id: string
  status: EscrowStatus
  role?: 'client' | 'prestataire'
}) {
  const { t } = useTranslation()
  const pay = useMissionAction(id, 'pay', 'in_escrow')
  const checkIn = useMissionAction(id, 'checkIn')
  const deliver = useMissionAction(id, 'deliver', 'delivered')
  const receive = useMissionAction(id, 'receive', 'released')
  const dispute = useMissionAction(id, 'dispute', 'disputed')

  if (role === 'prestataire') {
    if (status === 'in_escrow')
      return (
        <View style={{ gap: 8 }}>
          <Button
            label={t('mission.checkIn')}
            variant="secondary"
            haptic
            onPress={async () => {
              const coords = await getCurrentCoords()
              checkIn.mutate(coords ?? undefined)
            }}
          />
          <Button label={t('mission.deliver')} onPress={() => deliver.mutate(undefined)} loading={deliver.isPending} haptic />
        </View>
      )
    return null
  }

  // Rôle client (chercheur)
  if (status === 'awaiting_payment')
    return <Button label={t('payment.pay', { amount: '' })} onPress={() => pay.mutate(undefined)} loading={pay.isPending} haptic />
  if (status === 'delivered')
    return (
      <View style={{ gap: 8 }}>
        <Button label={t('mission.validate')} onPress={() => receive.mutate(undefined)} loading={receive.isPending} haptic testID="validate-mission" />
        <Button label={t('mission.dispute')} variant="ghost" onPress={() => dispute.mutate('Problème signalé')} />
      </View>
    )
  return null
}
