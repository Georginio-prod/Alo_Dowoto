import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Text,
  useTheme,
} from '@/design-system'
import { useOnboardingStore } from '@/features/auth/onboarding'
import { useSendOtp } from '@/features/auth/hooks'
import type { ContactMethod } from '@/features/auth/types'

/** Écran 2 — Inscription : contact + envoi du code (reprend m/auth.vue). */
export default function Register() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { method, value, set } = useOnboardingStore()
  const sendOtp = useSendOtp()
  const [error, setError] = useState<string | undefined>()

  const submit = () => {
    setError(undefined)
    const trimmed = value.trim()
    if (method === 'phone' && trimmed.replace(/\D/g, '').length < 8) {
      setError(t('auth.invalidPhone'))
      return
    }
    sendOtp.mutate(
      { method, value: trimmed },
      {
        onSuccess: () => router.push('/(auth)/verify'),
        onError: () => setError(t('common.genericError')),
      },
    )
  }

  return (
    <Screen
      footer={
        <Button
          label={t('auth.sendCode')}
          onPress={submit}
          loading={sendOtp.isPending}
          haptic
          testID="send-code"
        />
      }
    >
      <ScreenHeader title={t('auth.registerTitle')} back />
      <View style={{ gap: theme.spacing.md }}>
        <SegmentedControl<ContactMethod>
          segments={[
            { value: 'phone', label: t('auth.sms') },
            { value: 'email', label: t('auth.email') },
          ]}
          value={method}
          onChange={(m) => set({ method: m })}
        />
        <Input
          label={method === 'phone' ? t('auth.phone') : t('auth.emailLabel')}
          value={value}
          onChangeText={(v) => set({ value: v })}
          keyboardType={method === 'phone' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          error={error}
          placeholder={method === 'phone' ? '+228 90 00 00 00' : 'vous@exemple.tg'}
        />
        <Input
          label={t('auth.referral')}
          value={useOnboardingStore.getState().referralCode}
          onChangeText={(v) => set({ referralCode: v })}
          autoCapitalize="characters"
        />
        <Text variant="caption" color="muted">
          {t('welcome.attribution')}
        </Text>
      </View>
    </Screen>
  )
}
