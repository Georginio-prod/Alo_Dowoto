import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Input, Screen, ScreenHeader, Text } from '@/design-system'
import { useSetPassword } from '@/features/auth/hooks'
import { useSessionStore } from '@/features/auth/store'

/**
 * Écran — Création du mot de passe (#125). Session déjà ouverte.
 * Règles backend (checkPasswordStrength) : ≥ 8 caractères, une majuscule, un
 * chiffre, un caractère spécial. Validées ici pour un retour immédiat.
 */
function weakReasons(pwd: string): string[] {
  const r: string[] = []
  if (pwd.length < 8) r.push('8 caractères')
  if (!/[A-Z]/.test(pwd)) r.push('une majuscule')
  if (!/\d/.test(pwd)) r.push('un chiffre')
  if (!/[^A-Za-z0-9]/.test(pwd)) r.push('un caractère spécial')
  return r
}

export default function Password() {
  const { t } = useTranslation()
  const setPassword = useSetPassword()
  const user = useSessionStore((s) => s.user)
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState<string | undefined>()

  const done = () => router.replace(user?.role === 'prestataire' ? '/(prestataire)' : '/(chercheur)')

  const submit = () => {
    setError(undefined)
    const missing = weakReasons(pwd)
    if (missing.length > 0) {
      setError(`${t('auth.passwordWeak')}${missing.join(', ')}.`)
      return
    }
    setPassword.mutate(pwd, {
      onSuccess: done,
      onError: (e) => setError(e instanceof Error ? e.message : t('common.genericError')),
    })
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
          hint={t('auth.passwordHint')}
        />
      </View>
    </Screen>
  )
}
