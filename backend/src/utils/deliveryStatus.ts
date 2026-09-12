import { emailProvider, type EmailProvider } from './email'
import { smsProvider, type SmsProvider } from './sms'

/**
 * État des canaux d'envoi (OTP #23, notifications #360) : quel driver est actif
 * pour l'email et pour le SMS. Un canal à `null` signifie « aucun provider
 * configuré » → repli développement (code journalisé + `devCode`) hors
 * production, refus explicite (503) en production. Aucun secret n'est exposé :
 * seulement le nom du driver. Utilisé par `/api/health/delivery` et par le log
 * de démarrage, pour diagnostiquer en un coup d'œil un `.env` incomplet.
 */
export interface DeliveryStatus {
  email: EmailProvider | null
  sms: SmsProvider | null
}

export function deliveryStatus(): DeliveryStatus {
  return { email: emailProvider(), sms: smsProvider() }
}

/** Résumé lisible pour les logs, ex. `email: brevo | sms: aucun (repli devCode)`. */
export function describeDeliveryStatus(status: DeliveryStatus = deliveryStatus()): string {
  const describe = (provider: string | null) => provider ?? 'aucun (repli devCode)'
  return `email: ${describe(status.email)} | sms: ${describe(status.sms)}`
}
