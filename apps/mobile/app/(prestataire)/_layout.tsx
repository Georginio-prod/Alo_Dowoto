import React from 'react'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/design-system'
import { TabIcon } from '@/components/TabIcon'

/** Parcours prestataire — 4 onglets, icônes au trait du design system. */
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
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          height: 76,
          paddingBottom: 12,
          paddingTop: 10,
          ...theme.shadows.lg,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: theme.typography.caption.fontFamily },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.today'), tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }}
      />
      <Tabs.Screen
        name="demandes"
        options={{ title: t('tabs.requests'), tabBarIcon: ({ color }) => <TabIcon name="inbox" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('tabs.messages'), tabBarIcon: ({ color }) => <TabIcon name="message-circle" color={color} /> }}
      />
      <Tabs.Screen
        name="revenus"
        options={{ title: t('tabs.earnings'), tabBarIcon: ({ color }) => <TabIcon name="credit-card" color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }}
      />
    </Tabs>
  )
}
