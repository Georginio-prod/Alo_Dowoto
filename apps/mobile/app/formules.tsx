import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, ScreenHeader, StatusBadge, Text, useTheme } from '@/design-system'
import { PLANS, FREE_TRIAL_DAYS, formatFcfa, monthlyEquivalent } from '@/features/pricing/utils'
import type { PlanSlug } from '@/features/pricing/types'
import { useSubscribe } from '@/features/subscriptions'

/** Comparatif des formules d'abonnement prestataire (reprend formules.vue). */
export default function Formules() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [selected, setSelected] = useState<PlanSlug>('trimestriel')
  const subscribe = useSubscribe()

  return (
    <Screen
      footer={
        <Button
          label={t('formules.choose')}
          onPress={() =>
            subscribe.mutate(
              { slug: selected, method: 'mobile_money' },
              { onSuccess: () => router.back() },
            )
          }
          loading={subscribe.isPending}
          haptic
        />
      }
    >
      <ScreenHeader title={t('formules.title')} back />
      <Text variant="body" color="muted">
        {t('formules.subtitle')}
      </Text>

      {PLANS.map((plan) => {
        const active = plan.slug === selected
        return (
          <Card
            key={plan.slug}
            onPress={() => setSelected(plan.slug)}
            style={active ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="h2" style={{ textTransform: 'capitalize' }}>
                {plan.slug}
              </Text>
              {plan.hasTag ? <StatusBadge label={t('formules.popular')} tone="success" glyph="★" /> : null}
            </View>
            <Text variant="h1" color="primary">
              {plan.priceLabel}
            </Text>
            <Text variant="caption" color="muted">
              {formatFcfa(monthlyEquivalent(plan))} {t('formules.perMonth')}
            </Text>
            <Text variant="label" color="muted" style={{ marginTop: theme.spacing.sm }}>
              {plan.requestsPerMonth == null
                ? t('formules.requestsUnlimited')
                : t('formules.requestsPerMonth', { count: plan.requestsPerMonth })}
            </Text>
            <Text variant="caption" color="primary">
              🎁 {t('formules.freeTrial', { days: FREE_TRIAL_DAYS })}
            </Text>
          </Card>
        )
      })}
    </Screen>
  )
}
