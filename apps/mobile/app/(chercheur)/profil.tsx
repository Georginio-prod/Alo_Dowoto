import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Screen, Text, useTheme } from '@/design-system'
import { MenuGroup, MenuRow } from '@/components/MenuRow'
import { useSessionStore } from '@/features/auth/store'
import { useSignOut } from '@/features/auth/hooks'

/** Profil chercheur : identité + accès favoris, portefeuille, parrainage, aide. */
export default function ChercheurProfil() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const signOut = useSignOut()

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.md }}>
        <Avatar uri={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size={72} />
        <Text variant="h2">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'}</Text>
        {user?.location ? (
          <Text variant="label" color="muted">
            📍 {user.location}
          </Text>
        ) : null}
      </View>

      <MenuGroup>
        <MenuRow glyph="✏️" label={t('profile.edit')} onPress={() => router.push('/verification')} />
        <MenuRow glyph="🛡️" label={t('profile.verification')} onPress={() => router.push('/verification')} />
        <MenuRow glyph="⭐" label={t('provider.favorite')} onPress={() => router.push('/favoris')} />
        <MenuRow glyph="👛" label={t('wallet.title')} onPress={() => router.push('/portefeuille')} />
        <MenuRow glyph="🎁" label={t('profile.referral')} onPress={() => router.push('/parrainage')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow glyph="🔔" label={t('notifications.title')} onPress={() => router.push('/notifications')} />
        <MenuRow glyph="⚙️" label={t('profile.settings')} onPress={() => router.push('/parametres')} />
        <MenuRow glyph="❓" label={t('profile.help')} onPress={() => router.push('/aide')} />
        <MenuRow glyph="📄" label={t('howItWorks.title')} onPress={() => router.push('/comment-ca-marche')} />
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
