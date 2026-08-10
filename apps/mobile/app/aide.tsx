import React from 'react'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen, ScreenHeader } from '@/design-system'
import { MenuGroup, MenuRow } from '@/components/MenuRow'

/** Aide (reprend aide.vue). */
export default function Aide() {
  const { t } = useTranslation()
  return (
    <Screen>
      <ScreenHeader title={t('profile.help')} back />
      <MenuGroup>
        <MenuRow glyph="❓" label="FAQ" onPress={() => router.push('/faq')} />
        <MenuRow glyph="📄" label={t('howItWorks.title')} onPress={() => router.push('/comment-ca-marche')} />
        <MenuRow glyph="⚠️" label="Signaler un problème" onPress={() => router.push('/reclamation')} />
        <MenuRow glyph="⚙️" label={t('profile.settings')} onPress={() => router.push('/parametres')} />
      </MenuGroup>
    </Screen>
  )
}
