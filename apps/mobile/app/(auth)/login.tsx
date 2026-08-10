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
  useTheme,
} from '@/design-system'
import { useCreateSession, useSendOtp, useVerifyOtp } from '@/features/auth/hooks'
import type { ContactMethod } from '@/features/auth/types'

/**
 * Connexion : contact + code + mot de passe. Le backend traite un compte
 * existant : contact vérifié puis mot de passe redemandé (#126).
 */
export default function Login() {
  const { t } = useTranslation()
  const theme = useTheme()
  const [method, setMethod] = useState<ContactMethod>('sms')
  const [value, setValue] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const sendOtp = useSendOtp()
  const verifyOtp = useVerifyOtp()
  const createSession = useCreateSession()

  const requestCode = () => {
    setError(undefined)
    sendOtp.mutate(
      { method, value: value.trim() },
      { onSuccess: () => setSent(true), onError: () => setError(t('common.genericError')) },
    )
  }

  const submit = () => {
    setError(undefined)
    verifyOtp.mutate(
      { method, value: value.trim(), code: code.trim() },
      {
        onSuccess: () =>
          createSession.mutate(
            { method, value: value.trim(), role: 'client', password: password || undefined },
            {
              onSuccess: () => router.replace('/'),
              onError: () => setError('Identifiants invalides.'),
            },
          ),
        onError: () => setError(t('auth.invalidCode')),
      },
    )
  }

  return (
    <Screen
      footer={
        sent ? (
          <Button label={t('auth.verify')} onPress={submit} loading={createSession.isPending} haptic />
        ) : (
          <Button label={t('auth.sendCode')} onPress={requestCode} loading={sendOtp.isPending} />
        )
      }
    >
      <ScreenHeader title={t('auth.loginTitle')} back />
      <View style={{ gap: theme.spacing.md }}>
        <SegmentedControl<ContactMethod>
          segments={[
            { value: 'sms', label: t('auth.sms') },
            { value: 'email', label: t('auth.email') },
          ]}
          value={method}
          onChange={setMethod}
        />
        <Input
          label={method === 'sms' ? t('auth.phone') : t('auth.emailLabel')}
          value={value}
          onChangeText={setValue}
          keyboardType={method === 'sms' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          editable={!sent}
        />
        {sent ? (
          <>
            <Input
              label={t('auth.code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error}
            />
          </>
        ) : null}
      </View>
    </Screen>
  )
}
