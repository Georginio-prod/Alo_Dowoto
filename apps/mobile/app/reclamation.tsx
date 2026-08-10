import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Button, Input, Screen, ScreenHeader, Text } from '@/design-system'
import { request } from '@/services/http'

/** Réclamation (reprend reclamation.vue). */
export default function Reclamation() {
  const { t } = useTranslation()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const submit = async () => {
    setSending(true)
    setError(undefined)
    try {
      await request('/api/reclamations', { method: 'POST', body: { subject, message } })
      router.back()
    } catch {
      setError(t('common.genericError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen footer={<Button label={t('common.confirm')} onPress={submit} loading={sending} haptic />}>
      <ScreenHeader title={t('profile.help')} back />
      <View style={{ gap: 12 }}>
        <Input label="Sujet" value={subject} onChangeText={setSubject} />
        <Input
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
          error={error}
        />
        <Text variant="caption" color="muted">
          Nous vous répondrons par la messagerie interne.
        </Text>
      </View>
    </Screen>
  )
}
