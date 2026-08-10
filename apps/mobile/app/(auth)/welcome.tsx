import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, Text, useTheme } from '@/design-system'
import { useOnboardingStore } from '@/features/auth/onboarding'
import type { Role } from '@/features/auth/types'

/** Écran 1 — Bienvenue + choix du rôle (reprend app/pages/m/welcome.vue). */
export default function Welcome() {
  const { t } = useTranslation()
  const theme = useTheme()
  const setOnboarding = useOnboardingStore((s) => s.set)

  const choose = (role: Role) => {
    setOnboarding({ role })
    router.push('/(auth)/register')
  }

  return (
    <Screen
      footer={
        <Button
          label={t('welcome.login')}
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
        />
      }
    >
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <Text variant="h1">{t('welcome.title')}</Text>
        <Text variant="body" color="muted">
          {t('welcome.subtitle')}
        </Text>
      </View>

      <Text variant="bodyBold" style={{ marginTop: theme.spacing.lg }}>
        {t('welcome.chooseRole')}
      </Text>

      <Card onPress={() => choose('client')}>
        <Text variant="h2">🔎 {t('welcome.roleClient')}</Text>
        <Text variant="label" color="muted">
          {t('welcome.roleClientHint')}
        </Text>
      </Card>

      <Card onPress={() => choose('prestataire')}>
        <Text variant="h2">🛠️ {t('welcome.roleProvider')}</Text>
        <Text variant="label" color="muted">
          {t('welcome.roleProviderHint')}
        </Text>
      </Card>

      <Text variant="caption" color="muted" center style={{ marginTop: theme.spacing.md }}>
        {t('welcome.attribution')}
      </Text>
    </Screen>
  )
}
