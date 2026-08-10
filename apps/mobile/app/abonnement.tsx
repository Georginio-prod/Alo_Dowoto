import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Icon, Screen, ScreenHeader, StatusBadge, Text, useTheme } from '@/design-system'
import { PLANS, FREE_TRIAL_DAYS, formatDateShort } from '@/features/pricing/utils'
import { useStartTrial, useSubscribe, useSubscription } from '@/features/subscriptions'

const INCLUSIONS = [
  'Badge « Vérifié » après contrôle d’identité',
  'Paiement garanti par le séquestre',
  'Messagerie intégrée & avis clients',
  `${FREE_TRIAL_DAYS} jours d’essai gratuit à la 1ʳᵉ souscription`,
]

/** Abonnement & formules (design-edo §6.6). */
export default function Abonnement() {
  const { t } = useTranslation()
  const theme = useTheme()
  const subscription = useSubscription()
  const subscribe = useSubscribe()
  const trial = useStartTrial()
  const sub = subscription.data?.subscription
  const current = sub?.active ? sub.slug : null

  return (
    <Screen>
      <ScreenHeader title={t('subscription.title')} back />

      {/* Mon abonnement */}
      <Card padded={false} elevation="md">
        <View
          style={{
            backgroundColor: theme.colors.dark,
            padding: theme.spacing.lg,
            borderRadius: theme.radii.card,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('subscription.current')}
            </Text>
            {sub?.active ? <StatusBadge label="Active" tone="success" /> : null}
          </View>
          <Text variant="h2" style={{ color: '#fff', textTransform: 'capitalize' }}>
            {current ? `Formule ${current}` : t('subscription.none')}
          </Text>
          {sub?.expiresAt ? (
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Active jusqu’au {formatDateShort(sub.expiresAt)}
            </Text>
          ) : null}
        </View>
      </Card>

      {/* Formules */}
      {PLANS.map((plan) => {
        const isCurrent = plan.slug === current
        return (
          <Card
            key={plan.slug}
            elevation={plan.hasTag ? 'md' : 'sm'}
            style={isCurrent ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold" style={{ textTransform: 'capitalize' }}>
                  Formule {plan.slug}
                </Text>
                <Text variant="label" color="muted">
                  {plan.requestsPerMonth == null
                    ? 'Demandes illimitées · mise en avant'
                    : `${plan.requestsPerMonth} demandes / mois${plan.slug === 'trimestriel' ? ' · support prioritaire' : ''}`}
                </Text>
              </View>
              {isCurrent ? (
                <StatusBadge label="ACTUELLE" tone="success" />
              ) : plan.slug === 'trimestriel' ? (
                <StatusBadge label="MEILLEURE OFFRE" tone="warning" />
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: theme.spacing.sm }}>
              <Text variant="h1" color="primary" style={{ fontSize: 22 }}>
                {plan.priceLabel}
              </Text>
            </View>
            {!isCurrent ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <Button
                  label={sub?.active ? t('formules.choose') : t('subscription.startTrial')}
                  variant={plan.hasTag ? 'primary' : 'secondary'}
                  onPress={() =>
                    sub?.active
                      ? subscribe.mutate({ slug: plan.slug, method: 'mobile_money' })
                      : trial.mutate()
                  }
                  loading={subscribe.isPending || trial.isPending}
                  haptic
                />
              </View>
            ) : null}
          </Card>
        )
      })}

      {/* Inclus dans toutes les formules */}
      <Text variant="h2" style={{ marginTop: theme.spacing.sm }}>
        Inclus dans toutes les formules
      </Text>
      <Card>
        <View style={{ gap: theme.spacing.sm }}>
          {INCLUSIONS.map((inc) => (
            <View key={inc} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="check" size={16} color={theme.colors.primary} />
              <Text variant="label" style={{ flex: 1 }}>
                {inc}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  )
}
