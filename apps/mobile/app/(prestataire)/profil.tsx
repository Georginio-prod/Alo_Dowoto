import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Card, Screen, StatusBadge, Text, useTheme } from '@/design-system'
import { MenuGroup, MenuRow } from '@/components/MenuRow'
import { useSessionStore } from '@/features/auth/store'
import { useSignOut } from '@/features/auth/hooks'
import { useSubscription } from '@/features/subscriptions'

/** Profil prestataire : profil public + revenus, abonnement, vérif, aide. */
export default function PrestataireProfil() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const signOut = useSignOut()
  const subscription = useSubscription()
  const sub = subscription.data?.subscription

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.md }}>
        <Avatar uri={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size={72} />
        <Text variant="h2">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'}</Text>
        {user?.verified ? <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" /> : null}
      </View>

      <Card>
        <Text variant="label" color="muted">
          {t('subscription.current')}
        </Text>
        <Text variant="bodyBold" style={{ textTransform: 'capitalize' }}>
          {sub?.active && sub.slug ? sub.slug : t('subscription.none')}
        </Text>
      </Card>

      <MenuGroup>
        <MenuRow glyph="💰" label={t('earnings.title')} onPress={() => router.push('/revenus')} />
        <MenuRow glyph="⭐" label={t('subscription.title')} onPress={() => router.push('/abonnement')} />
        <MenuRow glyph="🛡️" label={t('profile.verification')} onPress={() => router.push('/verification')} />
        <MenuRow glyph="👤" label={t('profile.public')} onPress={() => router.push('/prestataire/' + (user?.id ?? ''))} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow glyph="🔔" label={t('notifications.title')} onPress={() => router.push('/notifications')} />
        <MenuRow glyph="⚙️" label={t('profile.settings')} onPress={() => router.push('/parametres')} />
        <MenuRow glyph="❓" label={t('profile.help')} onPress={() => router.push('/aide')} />
      </MenuGroup>

      <Button
        label={t('profile.logout')}
        variant="secondary"
        onPress={() => signOut.mutate(undefined, { onSuccess: () => router.replace('/(auth)/welcome') })}
        loading={signOut.isPending}
      />
    </Screen>
  )
}
