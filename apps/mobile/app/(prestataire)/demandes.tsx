import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text, useTheme } from '@/design-system'
import { useReceivedRequests } from '@/features/requests/hooks'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Demandes entrantes (reprend prestataire/demandes.vue). */
export default function Demandes() {
  const { t } = useTranslation()
  const theme = useTheme()
  const received = useReceivedRequests()

  return (
    <Screen>
      <Text variant="h1">{t('requests.incoming')}</Text>
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
                <Text variant="bodyBold">{r.title}</Text>
                {r.description ? (
                  <Text variant="label" color="muted" numberOfLines={2}>
                    {r.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.sm }}>
                  {r.budgetMax != null ? <Text color="primary">{formatFcfa(r.budgetMax)}</Text> : <View />}
                  <Button
                    label={t('requests.accept')}
                    fullWidth={false}
                    haptic
                    onPress={() => router.push('/(prestataire)/messages')}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
