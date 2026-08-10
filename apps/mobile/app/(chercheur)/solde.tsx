import React, { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, IconTile, Input, Screen, Text, useTheme } from '@/design-system'
import { useRecharge, useWallet } from '@/features/payments'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Onglet Solde / portefeuille (design-edo : l'argent à un geste). */
export default function Solde() {
  const { t } = useTranslation()
  const theme = useTheme()
  const wallet = useWallet()
  const recharge = useRecharge()
  const [amount, setAmount] = useState('')

  return (
    <Screen>
      <Text variant="h1">{t('wallet.title')}</Text>
      <QueryState
        isLoading={wallet.isLoading}
        isError={wallet.isError}
        data={wallet.data}
        onRetry={() => wallet.refetch()}
      >
        {(w) => (
          <View style={{ gap: theme.spacing.md }}>
            {/* Carte solde — bandeau encre du design system */}
            <Card elevation="md" style={{ backgroundColor: theme.colors.dark }}>
              <Text variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t('wallet.balance')}
              </Text>
              <Text variant="h1" style={{ color: '#fff', marginTop: 4 }}>
                {formatFcfa(w.balance)}
              </Text>
            </Card>

            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <IconTile glyph="＋" color={theme.colors.primary} size={44} />
                <Text variant="bodyBold" style={{ flex: 1 }}>
                  {t('wallet.recharge')}
                </Text>
              </View>
              <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
                <Input
                  label={t('wallet.amount')}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                  placeholder="5 000"
                />
                <Button
                  label={t('wallet.recharge')}
                  onPress={() => {
                    const n = Number(amount.replace(/\D/g, '')) || 0
                    if (n > 0) recharge.mutate({ amount: n, method: 'mobile_money' }, { onSuccess: () => setAmount('') })
                  }}
                  loading={recharge.isPending}
                  haptic
                />
              </View>
            </Card>

            <Text variant="h2">{t('earnings.movements')}</Text>
            {w.movements.length === 0 ? (
              <Text color="muted">{t('earnings.empty')}</Text>
            ) : (
              w.movements.map((m) => (
                <Card key={m.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text>{m.label}</Text>
                    <Text variant="bodyBold" color={m.amount >= 0 ? 'primary' : 'error'}>
                      {formatFcfa(m.amount)}
                    </Text>
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
