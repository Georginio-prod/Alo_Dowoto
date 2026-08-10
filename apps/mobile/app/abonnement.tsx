import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useStartTrial, useSubscription } from '@/features/subscriptions'
import { formatDateShort } from '@/features/pricing/utils'

/** Abonnement prestataire : formule active, essai, gestion (reprend abonnement.vue). */
export default function Abonnement() {
  const { t } = useTranslation()
  const theme = useTheme()
  const subscription = useSubscription()
  const trial = useStartTrial()
  const sub = subscription.data?.subscription

  return (
    <Screen
      footer={
        sub?.active ? (
          <Button label={t('subscription.manage')} onPress={() => router.push('/formules')} />
        ) : (
          <Button
            label={t('subscription.startTrial')}
            onPress={() => trial.mutate()}
            loading={trial.isPending}
            haptic
          />
        )
      }
    >
      <ScreenHeader title={t('subscription.title')} back />
      <Card>
        <Text variant="label" color="muted">
          {t('subscription.current')}
        </Text>
        <Text variant="h2" style={{ textTransform: 'capitalize' }}>
          {sub?.active && sub.slug ? sub.slug : t('subscription.none')}
        </Text>
        {sub?.expiresAt ? (
          <Text variant="caption" color="muted">
            {formatDateShort(sub.expiresAt)}
          </Text>
        ) : null}
        {sub?.trial ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Text variant="caption" color="primary">
              🎁 Essai en cours
            </Text>
          </View>
        ) : null}
      </Card>
      <Button label={t('formules.title')} variant="secondary" onPress={() => router.push('/formules')} />
    </Screen>
  )
}
