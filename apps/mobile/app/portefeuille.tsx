import React, { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useRecharge, useWallet } from '@/features/payments'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Portefeuille / recharge (reprend solde.vue). */
export default function Portefeuille() {
  const { t } = useTranslation()
  const theme = useTheme()
  const wallet = useWallet()
  const recharge = useRecharge()
  const [amount, setAmount] = useState('')

  return (
    <Screen
      footer={
        <Button
          label={t('wallet.recharge')}
          onPress={() => {
            const n = Number(amount.replace(/\D/g, '')) || 0
            if (n > 0) recharge.mutate({ amount: n, method: 'mobile_money' }, { onSuccess: () => setAmount('') })
          }}
          loading={recharge.isPending}
          haptic
        />
      }
    >
      <ScreenHeader title={t('wallet.title')} back />
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
                {t('wallet.balance')}
              </Text>
              <Text variant="h1" color="primary">
                {formatFcfa(w.balance)}
              </Text>
            </Card>
            <Input
              label={t('wallet.amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
            />
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
