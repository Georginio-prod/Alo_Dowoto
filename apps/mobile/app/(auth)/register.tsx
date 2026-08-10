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

/**
 * Écran 2 — Inscription : contact + profil, puis envoi du code.
 * Le backend exige username, prénom, nom et localisation pour CRÉER un compte
 * (server/utils/userStore.ts) — on les collecte ici et on les transmet à
 * createSession après vérification du code (voir verify.tsx).
 */
export default function Register() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { method, value, username, firstName, lastName, location, referralCode, set } =
    useOnboardingStore()
  const sendOtp = useSendOtp()
  const [error, setError] = useState<string | undefined>()

  const submit = () => {
    setError(undefined)
    const trimmed = value.trim()
    if (method === 'phone' && trimmed.replace(/\D/g, '').length < 8) {
      setError(t('auth.invalidPhone'))
      return
    }
    if (!firstName.trim() || !lastName.trim() || !location.trim() || !username.trim()) {
      setError(t('auth.profileRequired'))
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
          placeholder={method === 'phone' ? '+228 90 00 00 00' : 'vous@exemple.tg'}
        />

        <Text variant="bodyBold" style={{ marginTop: theme.spacing.sm }}>
          {t('auth.profileTitle')}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('auth.firstName')}
              value={firstName}
              onChangeText={(v) => set({ firstName: v })}
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={t('auth.lastName')}
              value={lastName}
              onChangeText={(v) => set({ lastName: v })}
              autoCapitalize="words"
            />
          </View>
        </View>
        <Input
          label={t('auth.username')}
          value={username}
          onChangeText={(v) => set({ username: v })}
          autoCapitalize="none"
        />
        <Input
          label={t('auth.city')}
          value={location}
          onChangeText={(v) => set({ location: v })}
          autoCapitalize="words"
        />
        <Input
          label={t('auth.referral')}
          value={referralCode}
          onChangeText={(v) => set({ referralCode: v })}
          autoCapitalize="characters"
          error={error}
        />
      </View>
    </Screen>
  )
}
