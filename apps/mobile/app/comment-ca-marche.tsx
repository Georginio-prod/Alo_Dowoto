import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'

/** Comment ça marche (reprend a-propos.vue). */
export default function CommentCaMarche() {
  const { t } = useTranslation()
  const theme = useTheme()
  const steps = [
    { glyph: '📝', title: 'Publiez votre besoin', body: 'Décrivez la mission en quelques mots et fixez un budget.' },
    { glyph: '🤝', title: 'Choisissez un prestataire', body: 'Comparez les profils vérifiés proches de vous.' },
    { glyph: '🔒', title: 'Payez en toute sécurité', body: "L'avance reste sous séquestre jusqu'à la validation." },
  ]
  return (
    <Screen>
      <ScreenHeader title={t('howItWorks.title')} back />
      <Text variant="body" color="muted">
        {t('howItWorks.subtitle')}
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        {steps.map((s, i) => (
          <Card key={i}>
            <Text variant="h2">
              {s.glyph} {s.title}
            </Text>
            <Text variant="label" color="muted">
              {s.body}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  )
}
