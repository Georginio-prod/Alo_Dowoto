import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '@/services/network'
import { useTheme } from '../theme'
import { Text } from './Text'

/** Bandeau « hors connexion » global (Phase 3). */
export function OfflineBanner() {
  const online = useNetworkStatus()
  const theme = useTheme()
  const { t } = useTranslation()
  if (online) return null
  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.ink }]}>
      <Text variant="caption" style={{ color: theme.colors.surface }} center>
        {t('common.offline')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' },
})
