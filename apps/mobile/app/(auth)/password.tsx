import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Input, Screen, ScreenHeader, Text } from '@/design-system'
import { useSetPassword } from '@/features/auth/hooks'
import { useSessionStore } from '@/features/auth/store'

/** Écran — Création du mot de passe (#125). Session déjà ouverte. */
export default function Password() {
  const { t } = useTranslation()
  const setPassword = useSetPassword()
  const user = useSessionStore((s) => s.user)
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState<string | undefined>()

  const done = () => router.replace(user?.role === 'prestataire' ? '/(prestataire)' : '/(chercheur)')

  const submit = () => {
    setError(undefined)
    if (pwd.length < 6) {
      setError('Minimum 6 caractères.')
      return
    }
    setPassword.mutate(pwd, { onSuccess: done, onError: () => setError(t('common.genericError')) })
  }

  return (
    <Screen footer={<Button label={t('common.save')} onPress={submit} loading={setPassword.isPending} haptic />}>
      <ScreenHeader title={t('auth.passwordCreate')} />
      <View style={{ gap: 12 }}>
        <Text variant="body" color="muted">
          {t('auth.passwordCreate')}
        </Text>
        <Input
          label={t('auth.password')}
          value={pwd}
          onChangeText={setPwd}
          secureTextEntry
          error={error}
        />
      </View>
    </Screen>
  )
}
