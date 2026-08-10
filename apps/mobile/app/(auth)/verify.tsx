import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Card, Icon, OtpInput, Screen, ScreenHeader, Text, useTheme } from '@/design-system'
import { useOnboardingStore } from '@/features/auth/onboarding'
import { useCreateSession, useSendOtp, useVerifyOtp } from '@/features/auth/hooks'

/** Écran 3 — Vérification du code à 6 chiffres (design-edo §1.3). */
export default function Verify() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { method, value, role, referralCode, username, firstName, lastName, location } =
    useOnboardingStore()
  const verify = useVerifyOtp()
  const createSession = useCreateSession()
  const resend = useSendOtp()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

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
      <ScreenHeader title={t('auth.codeTitle')} subtitle="3 / 4" back />
      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.sm }}>
        <Text variant="h1">{t('auth.codeTitle')}</Text>
        <Text variant="body" color="muted">
          {t('auth.codeSubtitle', { contact: value })}
        </Text>

        <OtpInput value={code} onChange={setCode} />
        {error ? (
          <Text variant="label" color="error">
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            label={countdown > 0 ? `Renvoyer dans 00:${String(countdown).padStart(2, '0')}` : t('auth.resend')}
            variant="ghost"
            fullWidth={false}
            disabled={countdown > 0 || resend.isPending}
            onPress={() => {
              resend.mutate({ method, value: value.trim() })
              setCountdown(30)
            }}
          />
          <Button label="Modifier le numéro" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </View>

        <Card>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Icon name="lock" size={16} color={theme.colors.muted} />
            <Text variant="label" color="muted" style={{ flex: 1 }}>
              Votre numéro sert uniquement à sécuriser le compte et les paiements Mobile Money. Il
              n’est jamais affiché publiquement.
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  )
}
