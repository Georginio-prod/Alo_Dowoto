import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Card, Screen, ScreenHeader, Text } from '@/design-system'

/** FAQ (reprend faq.vue). Contenu abrégé — le détail vient du backend/CMS. */
const ITEMS = [
  { q: 'Comment est protégé mon paiement ?', a: "L'avance est bloquée sous séquestre et versée au prestataire uniquement après validation de la mission." },
  { q: 'Comment devenir prestataire ?', a: 'Créez un compte prestataire, vérifiez votre identité, puis choisissez une formule (essai gratuit de 14 jours).' },
  { q: 'Puis-je annuler une demande ?', a: 'Oui, tant que la mission n\'a pas démarré, selon les conditions d\'annulation.' },
]

export default function Faq() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <Screen>
      <ScreenHeader title="FAQ" back />
      <View style={{ gap: 8 }}>
        {ITEMS.map((item, i) => (
          <Card key={i} onPress={() => setOpen(open === i ? null : i)}>
            <Pressable onPress={() => setOpen(open === i ? null : i)}>
              <Text variant="bodyBold">{item.q}</Text>
              {open === i ? (
                <Text variant="label" color="muted" style={{ marginTop: 6 }}>
                  {item.a}
                </Text>
              ) : null}
            </Pressable>
          </Card>
        ))}
      </View>
      <Text variant="caption" color="muted">
        {t('howItWorks.subtitle')}
      </Text>
    </Screen>
  )
}
