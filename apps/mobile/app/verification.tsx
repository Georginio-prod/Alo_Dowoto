import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Icon,
  Screen,
  ScreenHeader,
  SegmentedControl,
  StatusBadge,
  Text,
  useTheme,
} from '@/design-system'
import { submitVerification, useVerification } from '@/features/profile'
import { QueryState } from '@/components/QueryState'

type DocType = 'cni' | 'passeport' | 'permis'

/** Vérification d'identité (design-edo §7.2) — capture photo réelle. */
export default function Verification() {
  const { t } = useTranslation()
  const theme = useTheme()
  const verification = useVerification()
  const [docType, setDocType] = useState<DocType>('cni')
  const [recto, setRecto] = useState<string | null>(null)
  const [verso, setVerso] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const capture = async (set: (uri: string) => void) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true })
    if (!res.canceled && res.assets[0]) set(res.assets[0].uri)
  }

  const submit = async () => {
    if (!recto || !selfie) return
    setSending(true)
    try {
      await submitVerification({ idCardUrl: recto, selfieUrl: selfie })
      await verification.refetch()
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen
      footer={
        <Button
          label="Envoyer pour vérification"
          onPress={submit}
          loading={sending}
          disabled={!recto || !selfie}
          haptic
        />
      }
    >
      <ScreenHeader title={t('profile.verification')} back />
      <QueryState
        isLoading={verification.isLoading}
        isError={verification.isError}
        data={verification.data}
        onRetry={() => verification.refetch()}
      >
        {(v) => (
          <View style={{ gap: theme.spacing.lg }}>
            {v.status === 'verified' ? (
              <StatusBadge label={t('profile.verificationVerified')} tone="success" glyph="✓" />
            ) : v.status === 'pending' ? (
              <StatusBadge label={t('profile.verificationPending')} tone="warning" glyph="⏳" />
            ) : null}

            {/* Pourquoi vérifier */}
            <Card padded={false} elevation="sm">
              <View style={{ backgroundColor: theme.tints.success.bg, padding: theme.spacing.lg, borderRadius: theme.radii.card, flexDirection: 'row', gap: theme.spacing.md }}>
                <Icon name="shield" size={20} color={theme.tints.success.fg} />
                <Text variant="label" style={{ flex: 1, color: theme.tints.success.fg }}>
                  Le badge Vérifié double le taux d’acceptation des demandes et débloque les retraits
                  au-delà de 100 000 FCFA.
                </Text>
              </View>
            </Card>

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="bodyBold">Type de pièce</Text>
              <SegmentedControl<DocType>
                segments={[
                  { value: 'cni', label: 'CNI' },
                  { value: 'passeport', label: 'Passeport' },
                  { value: 'permis', label: 'Permis' },
                ]}
                value={docType}
                onChange={setDocType}
              />
            </View>

            <PhotoSlot n={1} title="Recto de la pièce" uri={recto} onPress={() => capture(setRecto)} />
            <PhotoSlot n={2} title="Verso de la pièce" uri={verso} onPress={() => capture(setVerso)} />
            <PhotoSlot n={3} title="Selfie de contrôle" uri={selfie} onPress={() => capture(setSelfie)} />

            <Text variant="caption" color="muted">
              Vos documents sont chiffrés, utilisés uniquement pour la vérification, et supprimés
              après 12 mois (voir politique de confidentialité).
            </Text>
          </View>
        )}
      </QueryState>
    </Screen>
  )
}

function PhotoSlot({
  n,
  title,
  uri,
  onPress,
}: {
  n: number
  title: string
  uri: string | null
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: uri ? theme.colors.primary : theme.colors.hairline,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {uri ? (
              <Icon name="check" size={15} color="#fff" />
            ) : (
              <Text variant="caption" color="muted">
                {n}
              </Text>
            )}
          </View>
          <Text variant="bodyBold" style={{ flex: 1 }}>
            {title}
          </Text>
          {uri ? (
            <Image source={{ uri }} style={{ width: 48, height: 32, borderRadius: 6 }} contentFit="cover" />
          ) : (
            <Icon name="camera" size={20} color={theme.colors.muted} />
          )}
        </View>
      </Card>
    </Pressable>
  )
}
