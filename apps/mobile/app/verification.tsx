import React from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, ScreenHeader, StatusBadge, Text, useTheme } from '@/design-system'
import { useVerification } from '@/features/profile'
import { QueryState } from '@/components/QueryState'

/** Vérification d'identité KYC (reprend profil/verification.vue). */
export default function Verification() {
  const { t } = useTranslation()
  const theme = useTheme()
  const verification = useVerification()

  return (
    <Screen
      footer={
        <Button
          label={`📷 ${t('request.addPhoto')}`}
          onPress={() => {
            /* expo-image-picker : pièce d'identité + selfie, compression avant envoi */
          }}
          haptic
        />
      }
    >
      <ScreenHeader title={t('profile.verification')} back />
      <QueryState
        isLoading={verification.isLoading}
        isError={verification.isError}
        data={verification.data}
        onRetry={() => verification.refetch()}
      >
        {(v) => (
          <View style={{ gap: theme.spacing.md }}>
            <Card>
              {v.status === 'verified' ? (
                <StatusBadge label={t('profile.verificationVerified')} tone="success" glyph="✓" />
              ) : v.status === 'pending' ? (
                <StatusBadge label={t('profile.verificationPending')} tone="warning" glyph="⏳" />
              ) : (
                <StatusBadge label={t('profile.verification')} tone="neutral" glyph="•" />
              )}
              <Text variant="label" color="muted" style={{ marginTop: theme.spacing.sm }}>
                Carte d'identité + photo passeport requises pour publier une première demande.
              </Text>
            </Card>
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
