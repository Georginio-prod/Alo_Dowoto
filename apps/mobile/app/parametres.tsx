import React from 'react'
import { Switch, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { MenuGroup, MenuRow } from '@/components/MenuRow'
import { usePreferences } from '@/features/preferences/store'

/** Paramètres : langue, mode économie de données, pages légales. */
export default function Parametres() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { dataSaver, setDataSaver, language, setLanguage } = usePreferences()

  const toggleLang = () => {
    const next = language === 'fr' ? 'en' : 'fr'
    setLanguage(next)
    void i18n.changeLanguage(next)
  }

  return (
    <Screen>
      <ScreenHeader title={t('profile.settings')} back />
      <MenuGroup>
        <MenuRow
          glyph="🌐"
          label={t('profile.language')}
          onPress={toggleLang}
          right={<Text color="muted">{language.toUpperCase()}</Text>}
        />
        <MenuRow
          glyph="📉"
          label={t('profile.dataSaver')}
          right={
            <Switch
              value={dataSaver}
              onValueChange={setDataSaver}
              trackColor={{ true: theme.colors.primary, false: theme.colors.hairline }}
            />
          }
        />
      </MenuGroup>

      <Text variant="label" color="muted" style={{ marginTop: theme.spacing.md }}>
        {t('howItWorks.title')}
      </Text>
      <MenuGroup>
        <MenuRow glyph="📄" label="CGU" onPress={() => router.push('/legal/cgu')} />
        <MenuRow glyph="🔒" label="Confidentialité" onPress={() => router.push('/legal/confidentialite')} />
        <MenuRow glyph="🍪" label="Cookies" onPress={() => router.push('/legal/cookies')} />
        <MenuRow glyph="ℹ️" label="Mentions légales" onPress={() => router.push('/legal/mentions-legales')} />
        <MenuRow glyph="⚠️" label={t('profile.help')} onPress={() => router.push('/reclamation')} />
      </MenuGroup>
      <View style={{ height: theme.spacing.xl }} />
    </Screen>
  )
}
