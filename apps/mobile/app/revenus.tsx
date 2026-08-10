import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useWallet } from '@/features/payments'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Revenus / solde prestataire (reprend prestataire/solde.vue). */
export default function Revenus() {
  const { t } = useTranslation()
  const theme = useTheme()
  const wallet = useWallet()

  return (
    <Screen>
      <ScreenHeader title={t('earnings.title')} back />
      <QueryState
        isLoading={wallet.isLoading}
        isError={wallet.isError}
        data={wallet.data}
        onRetry={() => wallet.refetch()}
      >
        {(w) => (
          <View style={{ gap: theme.spacing.md }}>
            <Card>
              <Text variant="label" color="muted">
                {t('earnings.balance')}
              </Text>
              <Text variant="h1" color="primary">
                {formatFcfa(w.balance)}
              </Text>
            </Card>
            <Text variant="h2">{t('earnings.movements')}</Text>
            {w.movements.length === 0 ? (
              <Text color="muted">{t('earnings.empty')}</Text>
            ) : (
              w.movements.map((m) => (
                <Card key={m.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text>{m.label}</Text>
                    <Text color={m.amount >= 0 ? 'primary' : 'error'}>{formatFcfa(m.amount)}</Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
