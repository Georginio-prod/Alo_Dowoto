import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Screen, ScreenHeader, Text } from '@/design-system'

/**
 * Pages légales (CGU, confidentialité, cookies, mentions légales). Le contenu
 * détaillé provient de `app/data/legalPages` du backend web ; ici on affiche
 * le titre et un renvoi. Route unique paramétrée par slug.
 */
const TITLES: Record<string, string> = {
  cgu: "Conditions générales d'utilisation",
  confidentialite: 'Politique de confidentialité',
  cookies: 'Cookies',
  'mentions-legales': 'Mentions légales',
}

export default function Legal() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const title = TITLES[slug] ?? 'Mentions légales'
  return (
    <Screen>
      <ScreenHeader title={title} back />
      <Text variant="body" color="muted">
        Le texte intégral est disponible sur worktogo.tg. Cette page reprend le contenu servi par le
        backend (données partagées avec le site web, non dupliquées côté mobile).
      </Text>
    </Screen>
  )
}
