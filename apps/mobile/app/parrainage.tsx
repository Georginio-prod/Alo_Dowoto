import React from 'react'
import { Share, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useReferrals } from '@/features/profile'
import { QueryState } from '@/components/QueryState'

/** Parrainage (reprend parrainage.vue). */
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
          <View style={{ gap: theme.spacing.md }}>
            <Card>
              <Text variant="label" color="muted">
                Votre code
              </Text>
              <Text variant="h1" color="primary">
                {r.code ?? '—'}
              </Text>
              <Text variant="caption" color="muted">
                {r.count} filleul(s)
              </Text>
            </Card>
            <Button
              label={t('common.seeAll')}
              onPress={() => {
                if (r.code) void Share.share({ message: `Rejoignez WorkTogo avec mon code ${r.code}` })
              }}
              haptic
            />
          </View>
        )}
      </QueryState>
    </Screen>
  )
}
