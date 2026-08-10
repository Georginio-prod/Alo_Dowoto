import React from 'react'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/design-system'
import { TabIcon } from '@/components/TabIcon'

/** Parcours prestataire — 4 onglets max, chacun avec libellé texte (Phase 4). */
export default function PrestataireLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.hairline,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.today'), tabBarIcon: ({ color }) => <TabIcon glyph="📅" color={color} /> }}
      />
      <Tabs.Screen
        name="demandes"
        options={{ title: t('tabs.requests'), tabBarIcon: ({ color }) => <TabIcon glyph="📥" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('tabs.messages'), tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} /> }}
      />
    </Tabs>
  )
}
