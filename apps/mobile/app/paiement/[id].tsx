import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CenterModal,
  Icon,
  PriceRow,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Text,
  useTheme,
} from '@/design-system'
import { formatFcfa } from '@/features/pricing/utils'
import { useInitiatePayment } from '@/features/payments'

/** Paiement de l'avance (escrow). Un écran = une décision : payer. */
export default function Paiement() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { id, amount } = useLocalSearchParams<{ id: string; amount?: string }>()
  const advance = Number(amount) || 5000
  const [method, setMethod] = useState<'mobile_money' | 'wallet'>('mobile_money')
  const [success, setSuccess] = useState(false)
  const pay = useInitiatePayment()

  const submit = () => {
    pay.mutate(
      { conversationId: id, method },
      { onSuccess: () => setSuccess(true), onError: () => setSuccess(false) },
    )
  }

  return (
    <Screen
      footer={
        <Button
          label={t('payment.pay', { amount: formatFcfa(advance) })}
          onPress={submit}
          loading={pay.isPending}
          haptic
          testID="pay"
        />
      }
    >
      <ScreenHeader title={t('payment.title')} back />

      {/* Bandeau séquestre rassurant (l'argent est bloqué, pas dépensé) */}
      <Card padded={false} elevation="sm">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            backgroundColor: theme.tints.success.bg,
            padding: theme.spacing.lg,
            borderRadius: theme.radii.card,
          }}
        >
          <Icon name="shield" size={22} color={theme.tints.success.fg} />
          <Text variant="label" style={{ flex: 1, color: theme.tints.success.fg }}>
            {t('payment.escrowNote')}
          </Text>
        </View>
      </Card>

      <Card>
        <Text variant="label" color="muted">
          {t('payment.summary')}
        </Text>
        <PriceRow label={t('payment.amount')} value={formatFcfa(advance)} emphasis />
      </Card>

      <Text variant="h2">{t('payment.method')}</Text>
      <SegmentedControl
        segments={[
          { value: 'mobile_money', label: t('payment.mobileMoney') },
          { value: 'wallet', label: t('payment.wallet') },
        ]}
        value={method}
        onChange={(m) => setMethod(m)}
      />

      <CenterModal visible={success} onClose={() => router.replace('/(chercheur)/messages')} title={`✅ ${t('payment.success')}`}>
        <View style={{ gap: theme.spacing.md }}>
          <Text color="muted">{t('payment.successNote')}</Text>
          <Button label={t('common.continue')} onPress={() => router.replace('/(chercheur)/messages')} haptic />
        </View>
      </CenterModal>
    </Screen>
  )
}
