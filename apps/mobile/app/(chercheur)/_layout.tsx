import React from 'react'
import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/design-system'
import { TabIcon } from '@/components/TabIcon'
import { useConversations } from '@/features/missions'

/**
 * Parcours chercheur — 5 onglets du design system (Accueil, Recherche,
 * Messages, Solde, Profil), icônes au trait + libellés.
 */
export default function ChercheurLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  const conversations = useConversations()
  const unread = conversations.data?.conversations.length ?? 0

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
        options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="recherche"
        options={{ title: t('tabs.search'), tabBarIcon: ({ color }) => <TabIcon name="search" color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: ({ color }) => <TabIcon name="message-circle" color={color} badge={unread} />,
        }}
      />
      <Tabs.Screen
        name="solde"
        options={{ title: t('wallet.balance'), tabBarIcon: ({ color }) => <TabIcon name="credit-card" color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <TabIcon name="user" color={color} /> }}
      />
    </Tabs>
  )
}
