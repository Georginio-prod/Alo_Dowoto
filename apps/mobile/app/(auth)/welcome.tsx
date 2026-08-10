import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Icon, IconTile, Screen, Text, useTheme } from '@/design-system'
import { useOnboardingStore } from '@/features/auth/onboarding'
import type { Role } from '@/features/auth/types'

/** Écran 1 — Lancement + choix du rôle (design-edo §1.1/§1.2). */
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
        <Button label={t('welcome.login')} variant="ghost" onPress={() => router.push('/(auth)/login')} />
      }
    >
      <View style={{ alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <IconTile glyph="W" color={theme.colors.primary} size={64} />
        <Text variant="h1" center>
          {t('common.appName')}
        </Text>
        <Text variant="body" color="muted" center>
          {t('welcome.subtitle')}
        </Text>
      </View>

      <Text variant="h2" style={{ marginTop: theme.spacing.lg }}>
        {t('welcome.chooseRole')}
      </Text>

      <RoleCard
        glyph="🔎"
        color={theme.colors.primary}
        title={t('welcome.roleClient')}
        bullets={[
          'Paiement bloqué jusqu’à validation',
          'Profils vérifiés & avis réels',
          'Gratuit pour les chercheurs',
        ]}
        onPress={() => choose('client')}
      />
      <RoleCard
        glyph="🛠️"
        color={theme.colors.dark}
        title={t('welcome.roleProvider')}
        bullets={['14 jours d’essai gratuit', 'À partir de 5 000 FCFA / mois', 'Recevez des demandes proches']}
        onPress={() => choose('prestataire')}
      />

      <Text variant="caption" color="muted" center style={{ marginTop: theme.spacing.sm }}>
        En continuant, vous acceptez les CGU et la politique de confidentialité.
      </Text>
    </Screen>
  )
}

function RoleCard({
  glyph,
  color,
  title,
  bullets,
  onPress,
}: {
  glyph: string
  color: string
  title: string
  bullets: string[]
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Card onPress={onPress} elevation="sm">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <IconTile glyph={glyph} color={color} />
        <Text variant="bodyBold" style={{ flex: 1 }}>
          {title}
        </Text>
        <Icon name="chevron-right" size={18} color={theme.colors.muted} />
      </View>
      <View style={{ marginTop: theme.spacing.md, gap: 6 }}>
        {bullets.map((b) => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={15} color={theme.colors.primary} />
            <Text variant="label" color="muted" style={{ flex: 1 }}>
              {b}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  )
}
