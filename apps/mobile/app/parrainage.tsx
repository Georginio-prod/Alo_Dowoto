import React from 'react'
import { Share, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Icon, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useReferrals } from '@/features/profile'
import { QueryState } from '@/components/QueryState'

/** Parrainage (design-edo §7.3). */
export default function Parrainage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const referrals = useReferrals()

  return (
    <Screen>
      <ScreenHeader title={t('profile.referral')} back />
      <QueryState
        isLoading={referrals.isLoading}
        isError={referrals.isError}
        data={referrals.data}
        onRetry={() => referrals.refetch()}
      >
        {(r) => (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="h1">Parrainez, gagnez 2 500 FCFA</Text>
              <Text variant="body" color="muted">
                Votre filleul reçoit 1 000 FCFA de crédit dès sa première prestation payée. Vous
                touchez 2 500 FCFA.
              </Text>
            </View>

            {/* Carte code — bandeau encre */}
            <Card padded={false} elevation="md">
              <View style={{ backgroundColor: theme.colors.dark, padding: theme.spacing.xl, borderRadius: theme.radii.card, alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 2 }}>
                  VOTRE CODE
                </Text>
                <Text variant="h1" style={{ color: '#fff', letterSpacing: 3 }}>
                  {r.code ?? '—'}
                </Text>
              </View>
            </Card>

            <Button
              label="Partager sur WhatsApp"
              onPress={() => {
                if (r.code) void Share.share({ message: `Rejoignez WorkTogo avec mon code ${r.code} et gagnez 1 000 FCFA sur votre première prestation !` })
              }}
              icon={<Icon name="send" size={16} color="#fff" />}
              haptic
            />

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Card style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="h1" style={{ fontSize: 26 }}>
                  {r.count ?? 0}
                </Text>
                <Text variant="caption" color="muted" center>
                  filleuls inscrits
                </Text>
              </Card>
              <Card style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="h1" color="primary" style={{ fontSize: 26 }}>
                  {(r.count ?? 0) * 2500}
                </Text>
                <Text variant="caption" color="muted" center>
                  FCFA gagnés (est.)
                </Text>
              </Card>
            </View>

            <Text variant="caption" color="muted">
              Le crédit est versé sur votre portefeuille sous 48 h après la libération des fonds de la
              première prestation du filleul.
            </Text>
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
