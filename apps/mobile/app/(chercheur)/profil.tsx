import React from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Card, Icon, Screen, StatusBadge, Text, useTheme } from '@/design-system'
import { MenuGroup, MenuRow } from '@/components/MenuRow'
import { useSessionStore } from '@/features/auth/store'
import { useSignOut } from '@/features/auth/hooks'
import { useVerification } from '@/features/profile'

/** Profil & réglages (design-edo §7.1). */
export default function ChercheurProfil() {
  const { t } = useTranslation()
  const theme = useTheme()
  const user = useSessionStore((s) => s.user)
  const signOut = useSignOut()
  const verification = useVerification()
  const verified = verification.data?.status === 'verified'

  return (
    <Screen>
      {/* En-tête profil */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Avatar uri={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} size={56} />
          <View style={{ flex: 1 }}>
            <Text variant="h2" numberOfLines={1}>
              {`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'}
            </Text>
            <Text variant="label" color="muted" numberOfLines={1}>
              {[user?.location].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>
          {verified ? <StatusBadge label={t('provider.verified')} tone="success" glyph="✓" /> : null}
        </View>
      </Card>

      {/* Bandeau vérification d'identité */}
      {!verified ? (
        <Card padded={false} elevation="sm">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              backgroundColor: theme.tints.warning.bg,
              padding: theme.spacing.lg,
              borderRadius: theme.radii.card,
            }}
          >
            <Icon name="shield" size={22} color={theme.tints.warning.fg} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold" style={{ color: theme.tints.warning.fg }}>
                Identité à vérifier
              </Text>
              <Text variant="caption" style={{ color: theme.tints.warning.fg }}>
                Débloque la publication de demandes et les retraits.
              </Text>
            </View>
            <Button label="Vérifier" variant="dark" fullWidth={false} onPress={() => router.push('/verification')} />
          </View>
        </Card>
      ) : null}

      <MenuGroup>
        <MenuRow icon="heart" label={t('provider.favorite')} onPress={() => router.push('/favoris')} />
        <MenuRow icon="credit-card" label={t('wallet.title')} onPress={() => router.push('/(chercheur)/solde')} />
        <MenuRow icon="gift" label={`${t('profile.referral')} · 2 500 F`} onPress={() => router.push('/parrainage')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow icon="bell" label={t('notifications.title')} onPress={() => router.push('/notifications')} />
        <MenuRow icon="settings" label={t('profile.settings')} onPress={() => router.push('/parametres')} />
        <MenuRow icon="help-circle" label={t('profile.help')} onPress={() => router.push('/aide')} />
        <MenuRow icon="calendar" label={t('howItWorks.title')} onPress={() => router.push('/comment-ca-marche')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow
          icon="log-out"
          label={t('profile.logout')}
          danger
          right={<View />}
          onPress={() => signOut.mutate(undefined, { onSuccess: () => router.replace('/(auth)/welcome') })}
        />
      </MenuGroup>
    </Screen>
  )
}
