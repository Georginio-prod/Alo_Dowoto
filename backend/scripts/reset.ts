import { PrismaClient } from '@prisma/client'

/**
 * Remise à zéro des données utilisateur (#mise-en-production).
 *
 * Objectif : passer d'une base peuplée de données de démonstration à une base
 * « propre » prête pour de vraies inscriptions — 0 utilisateur enregistré.
 *
 * Ce script SUPPRIME toutes les données transactionnelles / utilisateur
 * (comptes, profils, demandes, missions, paiements, portefeuilles, avis,
 * conversations, notifications, etc.) mais CONSERVE la configuration de la
 * plateforme (secteurs, formules d'abonnement, coupons, réglages, contenus de
 * site, questions préalables, modèles de messages) pour que l'application
 * reste fonctionnelle.
 *
 * ⚠️ OPÉRATION DESTRUCTIVE ET IRRÉVERSIBLE. Elle exige une confirmation
 * explicite pour éviter toute exécution accidentelle :
 *
 *   npm run db:reset -- --yes            (depuis la racine)
 *   # ou
 *   RESET_CONFIRM=yes npm run db:reset
 *
 * Après la remise à zéro, recréez un compte administrateur avec :
 *   npm run admin:create
 */

const prisma = new PrismaClient()

// Tables de données utilisateur / transactionnelles à vider. Les tables de
// configuration (Sector, SubSector, SubscriptionPlanConfig, Coupon,
// PlatformSettings, SiteContent, PrealableQuestion, MessageTemplate,
// NotificationCampaign) sont volontairement absentes : elles sont conservées.
// `TRUNCATE ... CASCADE` gère l'ordre des clés étrangères automatiquement.
const USER_DATA_TABLES = [
  'User',
  'Referral',
  'Session',
  'OtpCode',
  'VerifiedContact',
  'ProviderProfile',
  'ServiceRequest',
  'ServiceRequestMatch',
  'RecurringService',
  'MonthlyUsageCounter',
  'FraudAlert',
  'Review',
  'Subscription',
  'Payment',
  'WalletMovement',
  'EscrowOrder',
  'WalletRecharge',
  'Conversation',
  'Message',
  'ConversationRead',
  'Favorite',
  'Complaint',
  'ContournementAttempt',
  'Testimonial',
  'Notification',
  'WebhookNonce',
  'AiRateWindow',
  'AuditLog',
  'UnavailabilityPeriod',
  'Verification',
  'KycDecision',
  'AdminNote',
  'ReviewModeration',
  'RiskFalsePositive',
]

function maskedDbTarget(): string {
  const url = process.env.DATABASE_URL ?? ''
  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname}`
  } catch {
    return '(DATABASE_URL non défini ou illisible)'
  }
}

async function main() {
  const confirmed = process.argv.includes('--yes') || process.env.RESET_CONFIRM === 'yes'

  console.log('Remise à zéro des données utilisateur WorkTogo')
  console.log(`Base ciblée : ${maskedDbTarget()}`)

  if (!confirmed) {
    console.error(
      '\n⚠️  Confirmation requise. Cette opération supprime TOUS les comptes et données.\n'
      + '   Relancez avec :  npm run db:reset -- --yes\n',
    )
    process.exitCode = 1
    return
  }

  const usersBefore = await prisma.user.count()
  console.log(`Utilisateurs avant : ${usersBefore}`)

  const identifiers = USER_DATA_TABLES.map((t) => `"${t}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE;`)

  const usersAfter = await prisma.user.count()
  console.log(`Utilisateurs après : ${usersAfter}`)
  console.log('\nRemise à zéro terminée. Configuration (secteurs, formules, réglages) conservée.')
  console.log('Recréez un administrateur avec :  npm run admin:create')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
