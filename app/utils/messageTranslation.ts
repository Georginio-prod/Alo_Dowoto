import { getSectorFields } from '~/data/firstContactSectorFields'
import type { Message } from '~~/server/utils/conversationStore'

/**
 * Résout les lignes affichables d'un message de fil de discussion (#i18n) :
 * un message libre (`translationKey` nul, ex. `messages.post.ts`) est rendu
 * tel quel (`body`, jamais traduit — c'est le texte de quelqu'un) ; un
 * message généré par WorkTogo ou par un gabarit (confirmation, notification
 * de séquestre, reprogrammation…) est retraduit selon la locale du LECTEUR
 * courant plutôt que figé dans la langue de l'émetteur au moment de
 * l'envoi. Extrait de MessageBubble.vue pour rester testable sans monter le
 * composant, même principe que app/utils/favoriteConversations.ts.
 */

type Translate = (key: string, params?: Record<string, unknown>) => string

interface SectorAnswerParam {
  key: string
  value: string
}

function formatDate(timestamp: number, languageTag: string): string {
  return new Date(timestamp).toLocaleString(languageTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Reconstruit le message de première prise de contact (#129/#295) à partir
 * des valeurs brutes (clé de champ + valeur, jamais de libellé pré-résolu) —
 * `getSectorFields` porte déjà toute la logique de traduction des libellés
 * de champs/options (voir app/data/firstContactSectorFields.ts), ici
 * simplement réutilisée avec le `t` du lecteur courant.
 */
function firstContactLines(params: Record<string, unknown>, t: Translate): string[] {
  const description = typeof params.description === 'string' ? params.description : ''
  const sectorSlug = typeof params.sectorSlug === 'string' ? params.sectorSlug : null
  const sectorAnswers = Array.isArray(params.sectorAnswers) ? (params.sectorAnswers as SectorAnswerParam[]) : []
  const contact = typeof params.contact === 'string' ? params.contact : ''
  const urgency = typeof params.urgency === 'string' ? params.urgency : null

  const fields = getSectorFields(sectorSlug, (key: string) => t(key))
  const lines = [description]
  for (const answer of sectorAnswers) {
    const field = fields.find((f) => f.key === answer.key)
    if (!field) continue
    const label = field.type === 'select' ? (field.options?.find((option) => option.value === answer.value)?.label ?? answer.value) : answer.value
    lines.push(`${field.label} : ${label}`)
  }
  lines.push(t('systemMessages.contactLine', { contact }))
  if (urgency) lines.push(t('systemMessages.urgencyLine', { text: urgency }))
  return lines
}

type TranslatableMessage = Pick<Message, 'body' | 'translationKey' | 'translationParams'>

/** Aperçu compact (ex. barre latérale des conversations) : ne garde que la première ligne. */
export function resolveMessagePreview(message: TranslatableMessage, t: Translate, languageTag: string): string {
  return resolveMessageLines(message, t, languageTag)[0] ?? ''
}

export function resolveMessageLines(message: TranslatableMessage, t: Translate, languageTag: string): string[] {
  if (!message.translationKey) return [message.body]
  const params = message.translationParams ?? {}

  switch (message.translationKey) {
    case 'systemMessages.firstContact':
      return firstContactLines(params, t)

    case 'systemMessages.tacitValidationWarning': {
      const deadline = typeof params.deadline === 'number' ? formatDate(params.deadline, languageTag) : ''
      return [t(message.translationKey, { deadline })]
    }

    case 'systemMessages.rescheduleProposed': {
      const date = typeof params.date === 'number' ? formatDate(params.date, languageTag) : ''
      const note = typeof params.note === 'string' ? params.note : ''
      const base = t(message.translationKey, { date })
      return [note ? `${base} ${note}` : base]
    }

    case 'systemMessages.recurringDebited': {
      const amount = typeof params.amount === 'number' ? params.amount.toLocaleString(languageTag) : ''
      const frequencyKey = typeof params.frequency === 'string' ? params.frequency : ''
      const frequency = t(`systemMessages.frequency.${frequencyKey}`)
      return [t(message.translationKey, { amount, frequency })]
    }

    default:
      return [t(message.translationKey, params)]
  }
}
