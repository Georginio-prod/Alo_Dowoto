/**
 * Envoi d'emails transactionnels (OTP, #23) derrière une abstraction provider.
 *
 * Driver actuel : Brevo (ex-Sendinblue) via son API REST — offre gratuite
 * (300 emails/jour) qui permet d'envoyer à n'importe quel destinataire sans
 * posséder de nom de domaine, sans dépendance npm. Comme pour les SMS
 * (server/utils/sms.ts), changer de provider = ajouter un driver ici sans
 * toucher aux routes qui appellent sendEmail().
 *
 * Configuration (voir .env.example) :
 * - BREVO_API_KEY   : clé API Brevo (SMTP & API > API Keys, commence par "xkeysib-")
 * - EMAIL_FROM      : adresse expéditrice (doit être vérifiée dans Brevo :
 *                     Senders & Domains > Senders)
 * - EMAIL_FROM_NAME : nom d'affichage de l'expéditeur (optionnel, "WorkTogo"
 *                     par défaut)
 *
 * Sans ces variables, aucun email ne part : les appelants gardent leur repli
 * développement (journalisation du code + devCode renvoyé au client).
 */

export type SendEmailResult =
  | { ok: true }
  | { ok: false; error: string }

function brevoConfig() {
  const apiKey = process.env.BREVO_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return null
  return { apiKey, from, fromName: process.env.EMAIL_FROM_NAME || 'WorkTogo' }
}

/** Vrai si un provider email est configuré (les emails partent réellement). */
export function isEmailConfigured(): boolean {
  return brevoConfig() !== null
}

/**
 * Envoie un email transactionnel à `to`.
 * Ne lève jamais : les erreurs provider sont renvoyées dans le résultat
 * pour laisser l'appelant décider (journaliser, répondre 502, etc.).
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<SendEmailResult> {
  const config = brevoConfig()
  if (!config) {
    return { ok: false, error: 'Aucun provider email configuré (BREVO_API_KEY / EMAIL_FROM manquants).' }
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: config.from, name: config.fromName },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, error: `Brevo a répondu ${response.status} : ${detail.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: `Échec de l'appel Brevo : ${error instanceof Error ? error.message : String(error)}` }
  }
}
