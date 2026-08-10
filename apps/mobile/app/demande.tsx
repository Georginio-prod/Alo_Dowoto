import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Input,
  PriceRow,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Text,
  useTheme,
} from '@/design-system'
import { estimate, formatFcfa } from '@/features/pricing/utils'
import type { Urgency } from '@/features/pricing/types'
import { useCreateRequest } from '@/features/requests/hooks'

/**
 * Fiche préalable en 3 étapes avec estimation en direct (reprend demande.vue).
 * Un écran = une décision : chaque étape est une seule saisie principale.
 */
export default function Demande() {
  const { t } = useTranslation()
  const theme = useTheme()
  const create = useCreateRequest()

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState('')
  const [budget, setBudget] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('semaine')
  const [error, setError] = useState<string | undefined>()

  const budgetNum = Number(budget.replace(/\D/g, '')) || 0
  const est = useMemo(() => estimate({ budgetMax: budgetNum, urgency }), [budgetNum, urgency])

  const submit = () => {
    setError(undefined)
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        budgetMax: budgetNum,
        urgency,
        location: '',
      },
      {
        onSuccess: (res) => router.replace(`/paiement/${res.request.id}`),
        onError: () => setError(t('common.genericError')),
      },
    )
  }

  return (
    <Screen
      footer={
        step < 3 ? (
          <Button
            label={t('common.next')}
            onPress={() => setStep((s) => s + 1)}
            disabled={step === 1 ? title.trim().length < 3 : budgetNum <= 0}
          />
        ) : (
          <Button label={t('request.submit')} onPress={submit} loading={create.isPending} haptic testID="submit-request" />
        )
      }
    >
      <ScreenHeader title={t('request.title')} subtitle={t('request.step', { current: step, total: 3 })} back />

      {step === 1 ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="h2">{t('request.step1')}</Text>
          <Input label={t('request.titleLabel')} value={title} onChangeText={setTitle} />
          <Input
            label={t('request.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          <Button label={`📷 ${t('request.addPhoto')}`} variant="ghost" onPress={() => { /* innovation photo — Phase 5 */ }} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="h2">{t('request.step2')}</Text>
          <Input label={t('request.skillsLabel')} value={skills} onChangeText={setSkills} placeholder="ex. Plomberie, Soudure" />
          <Input
            label={t('request.budgetLabel')}
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
          />
          <Text variant="label" color="muted">
            {t('request.urgencyLabel')}
          </Text>
          <SegmentedControl<Urgency>
            segments={[
              { value: 'immediate', label: t('request.urgencyImmediate') },
              { value: 'semaine', label: t('request.urgencySemaine') },
              { value: 'flexible', label: t('request.urgencyFlexible') },
            ]}
            value={urgency}
            onChange={setUrgency}
          />
          <Card>
            <Text variant="label" color="muted">
              {t('request.estimate')}
            </Text>
            <Text variant="h2" color="primary">
              {t('request.estimateRange', { low: formatFcfa(est.low), high: formatFcfa(est.high) })}
            </Text>
            <Text variant="caption" color="muted">
              {t('request.estimateNote')}
            </Text>
          </Card>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="h2">{t('request.step3')}</Text>
          <Card>
            <PriceRow label={t('request.titleLabel')} value={title || '—'} />
            <PriceRow label={t('request.urgencyLabel')} value={t(`request.urgency${cap(urgency)}`)} />
            <PriceRow label={t('request.budgetLabel')} value={formatFcfa(budgetNum)} />
            <PriceRow label={t('request.estimate')} value={`${formatFcfa(est.low)} – ${formatFcfa(est.high)}`} emphasis />
          </Card>
          {error ? (
            <Text variant="label" color="error">
              {error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
