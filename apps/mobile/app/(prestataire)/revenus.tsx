import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text, useTheme } from '@/design-system'
import { useWallet } from '@/features/payments'
import { formatFcfa } from '@/features/pricing/utils'
import { QueryState } from '@/components/QueryState'

/** Revenus & retrait prestataire (design-edo §6.5). */
export default function Revenus() {
  const { t } = useTranslation()
  const theme = useTheme()
  const wallet = useWallet()

  return (
    <Screen>
      <Text variant="h1">{t('earnings.title')}</Text>
      <QueryState
        isLoading={wallet.isLoading}
        isError={wallet.isError}
        data={wallet.data}
        onRetry={() => wallet.refetch()}
      >
        {(w) => (
          <View style={{ gap: theme.spacing.md }}>
            {/* Disponible pour retrait — bandeau encre */}
            <Card padded={false} elevation="md">
              <View style={{ backgroundColor: theme.colors.dark, padding: theme.spacing.lg, borderRadius: theme.radii.card, gap: theme.spacing.md }}>
                <View>
                  <Text variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('earnings.balance')}
                  </Text>
                  <Text variant="h1" style={{ color: '#fff' }}>
                    {formatFcfa(w.balance)}
                  </Text>
                </View>
                <Button label="Retirer vers Flooz / T-Money" variant="primary" haptic onPress={() => { /* retrait */ }} />
              </View>
            </Card>

            <Text variant="h2">Derniers versements</Text>
            {w.movements.length === 0 ? (
              <Text color="muted">{t('earnings.empty')}</Text>
            ) : (
              w.movements.map((m) => (
                <Card key={m.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ flex: 1 }} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <Text variant="bodyBold" color={m.amount >= 0 ? 'primary' : 'error'}>
                      {m.amount >= 0 ? '+' : ''}
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
