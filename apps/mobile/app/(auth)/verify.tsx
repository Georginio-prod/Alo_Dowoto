import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Input, Screen, ScreenHeader, Text } from '@/design-system'
import { useOnboardingStore } from '@/features/auth/onboarding'
import { useCreateSession, useSendOtp, useVerifyOtp } from '@/features/auth/hooks'

/** Écran 3 — Vérification par code à 6 chiffres. */
export default function Verify() {
  const { t } = useTranslation()
  const { method, value, role, referralCode, username, firstName, lastName, location } =
    useOnboardingStore()
  const verify = useVerifyOtp()
  const createSession = useCreateSession()
  const resend = useSendOtp()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | undefined>()

  const submit = () => {
    setError(undefined)
    if (code.trim().length !== 6) {
      setError(t('auth.invalidCode'))
      return
    }
    verify.mutate(
      { method, value: value.trim(), code: code.trim() },
      {
        onSuccess: () => {
          // Contact vérifié → création de session. Le mot de passe est
          // ensuite créé/redemandé selon le backend (#125/#126).
          createSession.mutate(
            {
              method,
              value: value.trim(),
              role,
              username: username.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              location: location.trim(),
              referralCode: referralCode || undefined,
            },
            {
              onSuccess: () => router.replace('/(auth)/password'),
              onError: (e) => setError(e instanceof Error ? e.message : t('common.genericError')),
            },
          )
        },
        onError: (e) => setError(e instanceof Error ? e.message : t('common.genericError')),
      },
    )
  }

  const busy = verify.isPending || createSession.isPending

  return (
    <Screen footer={<Button label={t('auth.verify')} onPress={submit} loading={busy} haptic testID="verify" />}>
      <ScreenHeader title={t('auth.codeTitle')} back />
      <View style={{ gap: 12 }}>
        <Text variant="body" color="muted">
          {t('auth.codeSubtitle', { contact: value })}
        </Text>
        <Input
          label={t('auth.code')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          error={error}
          placeholder="••••••"
        />
        <Button
          label={t('auth.resend')}
          variant="ghost"
          onPress={() => resend.mutate({ method, value: value.trim() })}
          loading={resend.isPending}
        />
      </View>
    </Screen>
  )
}
