import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../server/utils/password'

/**
 * Données de test réalistes pour le dashboard admin (#dashboard-admin).
 *
 * Ne peuple que les données réellement persistées en base (Prisma). Les
 * profils prestataires déclaratifs, avis, demandes de service (fiches
 * préalables) et soumissions KYC vivent encore dans des stores en mémoire
 * (server/utils/providerStore.ts, reviewStore.ts, requestStore.ts,
 * verificationStore.ts — voir docs/admin-dashboard.md) : un script autonome,
 * qui tourne dans un process séparé du serveur, ne peut pas les écrire. Pour
 * les peupler, utilisez l'application elle-même une fois lancée (créer un
 * profil prestataire, soumettre un KYC, laisser un avis...).
 *
 * Lancement : `npm run db:seed` (ou `npx prisma db seed`).
 */

const prisma = new PrismaClient()

const DAY_MS = 24 * 60 * 60 * 1000

async function upsertUser(input: {
  contact: string
  role: 'client' | 'prestataire' | 'admin'
  firstName: string
  lastName: string
  username: string
  location: string
  password: string
  status?: 'active' | 'suspended'
  riskFlag?: boolean
  riskNote?: string
  adminLevel?: string
  createdAt?: Date
}) {
  const passwordHash = await hashPassword(input.password)
  return prisma.user.upsert({
    where: { contact: input.contact },
    create: {
      contact: input.contact,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      location: input.location,
      passwordHash,
      status: input.status ?? 'active',
      riskFlag: input.riskFlag ?? false,
      riskNote: input.riskNote,
      adminLevel: input.adminLevel,
      createdAt: input.createdAt ?? new Date(),
    },
    update: {},
  })
}

async function main() {
  console.log('Seed du dashboard admin WorkTogo…')

  // --- Compte admin ---
  const admin = await upsertUser({
    contact: 'admin@worktogo.tg',
    role: 'admin',
    firstName: 'Ama',
    lastName: 'Admin',
    username: 'ama.admin',
    location: 'Lomé',
    password: 'Admin1234!',
    adminLevel: 'admin',
  })
  console.log(`Admin : ${admin.contact} / mot de passe Admin1234!`)

  // --- Prestataires ---
  const providers = await Promise.all([
    upsertUser({ contact: '+22890000001', role: 'prestataire', firstName: 'Kossi', lastName: 'Mensah', username: 'kossi.m', location: 'Lomé', password: 'Password1!' }),
    upsertUser({ contact: '+22890000002', role: 'prestataire', firstName: 'Afi', lastName: 'Adjovi', username: 'afi.a', location: 'Kara', password: 'Password1!' }),
    upsertUser({ contact: '+22890000003', role: 'prestataire', firstName: 'Yao', lastName: 'Kutor', username: 'yao.k', location: 'Lomé', password: 'Password1!', riskFlag: true, riskNote: 'Plusieurs tentatives de contournement détectées.' }),
    upsertUser({ contact: '+22890000004', role: 'prestataire', firstName: 'Essi', lastName: 'Bakonde', username: 'essi.b', location: 'Sokodé', password: 'Password1!', status: 'suspended' }),
    upsertUser({ contact: '+22890000005', role: 'prestataire', firstName: 'Komi', lastName: 'Aziawo', username: 'komi.a', location: 'Lomé', password: 'Password1!' }),
  ])
  const [providerA, providerB, providerRisky, providerSuspended, providerE] = providers

  // --- Chercheurs ---
  const clients = await Promise.all([
    upsertUser({ contact: '+22891000001', role: 'client', firstName: 'Nadia', lastName: 'Sossou', username: 'nadia.s', location: 'Lomé', password: 'Password1!' }),
    upsertUser({ contact: '+22891000002', role: 'client', firstName: 'Edem', lastName: 'Togbe', username: 'edem.t', location: 'Lomé', password: 'Password1!' }),
    upsertUser({ contact: '+22891000003', role: 'client', firstName: 'Akouvi', lastName: 'Dogbe', username: 'akouvi.d', location: 'Kpalimé', password: 'Password1!', riskFlag: true, riskNote: 'Plusieurs annulations rapprochées.' }),
    upsertUser({ contact: '+22891000004', role: 'client', firstName: 'Sena', lastName: 'Amegan', username: 'sena.a', location: 'Lomé', password: 'Password1!' }),
  ])
  const [clientA, clientB, clientRisky, clientD] = clients

  // --- Abonnements ---
  await prisma.subscription.upsert({
    where: { id: `seed-sub-${providerA.id}` }, create: { id: `seed-sub-${providerA.id}`, userId: providerA.id, plan: 'trimestriel', status: 'actif', dateDebut: new Date(Date.now() - 10 * DAY_MS), dateFin: new Date(Date.now() + 80 * DAY_MS) }, update: {},
  })
  await prisma.subscription.upsert({
    where: { id: `seed-sub-${providerB.id}` }, create: { id: `seed-sub-${providerB.id}`, userId: providerB.id, plan: 'annuel', status: 'actif', dateDebut: new Date(Date.now() - 40 * DAY_MS), dateFin: new Date(Date.now() + 325 * DAY_MS) }, update: {},
  })
  await prisma.subscription.upsert({
    where: { id: `seed-sub-${providerRisky.id}` }, create: { id: `seed-sub-${providerRisky.id}`, userId: providerRisky.id, plan: 'mensuel', status: 'actif', dateDebut: new Date(Date.now() - 5 * DAY_MS), dateFin: new Date(Date.now() + 25 * DAY_MS) }, update: {},
  })
  await prisma.subscription.upsert({
    where: { id: `seed-sub-${providerE.id}` }, create: { id: `seed-sub-${providerE.id}`, userId: providerE.id, plan: 'mensuel', status: 'expire', dateDebut: new Date(Date.now() - 60 * DAY_MS), dateFin: new Date(Date.now() - 30 * DAY_MS) }, update: {},
  })

  // --- Formules & code promo (config admin) ---
  await prisma.subscriptionPlanConfig.upsert({ where: { slug: 'mensuel' }, create: { slug: 'mensuel', name: 'Mensuel', priceAmount: 5000, durationDays: 30, commissionRate: 0.1, features: 'Profil visible\nRéception de demandes\nBadge vérifié' }, update: {} })
  await prisma.subscriptionPlanConfig.upsert({ where: { slug: 'trimestriel' }, create: { slug: 'trimestriel', name: 'Trimestriel', priceAmount: 13500, durationDays: 90, commissionRate: 0.1, features: 'Profil visible\nRéception de demandes\nBadge vérifié\nSupport prioritaire' }, update: {} })
  await prisma.subscriptionPlanConfig.upsert({ where: { slug: 'annuel' }, create: { slug: 'annuel', name: 'Annuel', priceAmount: 48000, durationDays: 365, commissionRate: 0.08, features: 'Profil visible\nRéception de demandes\nBadge vérifié\nMise en avant\nSupport prioritaire' }, update: {} })
  await prisma.coupon.upsert({ where: { code: 'BIENVENUE10' }, create: { code: 'BIENVENUE10', discountType: 'percent', discountValue: 10, usageLimit: 100 }, update: {} })
  await prisma.coupon.upsert({ where: { code: 'FETE2026' }, create: { code: 'FETE2026', discountType: 'amount', discountValue: 1000, active: false }, update: {} })

  // --- Réglages plateforme ---
  await prisma.platformSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })

  // --- Secteurs (CRUD admin) ---
  const sectorBtp = await prisma.sector.upsert({ where: { slug: 'btp' }, create: { slug: 'btp', name: 'Artisanat & BTP', emoji: '🔨', color: '#D97706', ink: '#3A2205', order: 1 }, update: {} })
  await prisma.sector.upsert({ where: { slug: 'menage' }, create: { slug: 'menage', name: 'Ménage & Maison', emoji: '🧹', color: '#14A800', ink: '#0F2318', order: 2 }, update: {} })
  await prisma.sector.upsert({ where: { slug: 'digital' }, create: { slug: 'digital', name: 'Digital', emoji: '💻', color: '#2563EB', ink: '#0B1F4D', order: 3 }, update: {} })
  await prisma.prealableQuestion.upsert({ where: { id: 'seed-q1' }, create: { id: 'seed-q1', sectorId: sectorBtp.id, label: 'Quel type de travaux ?', order: 1, required: true }, update: {} })

  // --- Contenu éditorial ---
  await prisma.siteContent.upsert({ where: { key: 'home.hero.title' }, create: { key: 'home.hero.title', label: 'Titre principal accueil', value: 'Trouvez le bon prestataire près de chez vous' }, update: {} })
  await prisma.siteContent.upsert({ where: { key: 'faq.intro' }, create: { key: 'faq.intro', label: 'Introduction FAQ', value: 'Retrouvez les réponses aux questions les plus fréquentes.' }, update: {} })

  // --- Modèles de messages ---
  await prisma.messageTemplate.upsert({ where: { key: 'payment_confirmation' }, create: { key: 'payment_confirmation', label: 'Confirmation de paiement', channel: 'in_app', body: 'Votre paiement a bien été confirmé, merci !' }, update: {} })
  await prisma.messageTemplate.upsert({ where: { key: 'validation_reminder' }, create: { key: 'validation_reminder', label: 'Rappel de validation', channel: 'email', subject: 'Une mission attend votre validation', body: "N'oubliez pas de valider votre mission WorkTogo terminée." }, update: {} })

  // --- Conversations, missions (EscrowOrder) et paiements ---
  async function seedMission(client: { id: string }, provider: { id: string }, amount: number, status: 'awaiting_payment' | 'in_escrow' | 'delivered' | 'released' | 'refunded' | 'disputed', ageDays: number, dispute?: { reason: string, evidence?: string, response?: string }) {
    const conversation = await prisma.conversation.upsert({
      where: { clientId_providerId: { clientId: client.id, providerId: provider.id } },
      create: { clientId: client.id, providerId: provider.id, firstContactDone: true, createdAt: new Date(Date.now() - ageDays * DAY_MS) },
      update: {},
    })
    const existingMessages = await prisma.message.count({ where: { conversationId: conversation.id } })
    if (existingMessages === 0) {
      await prisma.message.createMany({
        data: [
          { conversationId: conversation.id, senderId: client.id, senderRole: 'client', body: 'Bonjour, je suis disponible ce week-end pour la prestation.', createdAt: new Date(Date.now() - ageDays * DAY_MS + 60_000) },
          { conversationId: conversation.id, senderId: provider.id, senderRole: 'prestataire', body: "C'est noté, je confirme le créneau.", createdAt: new Date(Date.now() - ageDays * DAY_MS + 120_000) },
        ],
      })
    }

    const createdAt = new Date(Date.now() - ageDays * DAY_MS)
    const order = await prisma.escrowOrder.upsert({
      where: { conversationId: conversation.id },
      create: {
        conversationId: conversation.id,
        clientId: client.id,
        providerId: provider.id,
        amount,
        status,
        createdAt,
        paidAt: status === 'awaiting_payment' ? null : createdAt,
        deliveredAt: status === 'delivered' || status === 'released' ? new Date(createdAt.getTime() + DAY_MS) : null,
        releasedAt: status === 'released' ? new Date(createdAt.getTime() + 2 * DAY_MS) : null,
        cancelledAt: status === 'refunded' ? new Date(createdAt.getTime() + DAY_MS) : null,
        cancelReason: status === 'refunded' ? 'Prestataire indisponible le jour J.' : null,
        disputedAt: status === 'disputed' ? new Date(createdAt.getTime() + DAY_MS) : null,
        disputeReason: dispute?.reason ?? null,
        disputeEvidence: dispute?.evidence ?? null,
        disputeResponse: dispute?.response ?? null,
        disputeRespondedAt: dispute?.response ? new Date(createdAt.getTime() + 1.5 * DAY_MS) : null,
        checkInAt: status === 'delivered' || status === 'released' || status === 'disputed' ? new Date(createdAt.getTime() + DAY_MS - 3_600_000) : null,
        checkOutAt: status === 'delivered' || status === 'released' || status === 'disputed' ? new Date(createdAt.getTime() + DAY_MS) : null,
      },
      update: {},
    })

    if (status !== 'awaiting_payment') {
      await prisma.walletMovement.upsert({ where: { id: `seed-debit-${order.id}` }, create: { id: `seed-debit-${order.id}`, walletUserId: client.id, type: 'escrow_debit', amount, reference: order.id, counterpartyUserId: provider.id, createdAt }, update: {} })
    }
    if (status === 'released') {
      const commission = Math.round(amount * 0.1)
      await prisma.walletMovement.upsert({ where: { id: `seed-release-${order.id}` }, create: { id: `seed-release-${order.id}`, walletUserId: provider.id, type: 'escrow_release', amount: amount - commission, reference: order.id, counterpartyUserId: client.id, createdAt: order.releasedAt! }, update: {} })
      await prisma.walletMovement.upsert({ where: { id: `seed-commission-${order.id}` }, create: { id: `seed-commission-${order.id}`, walletUserId: 'worktogo-platform', type: 'commission', amount: commission, reference: order.id, counterpartyUserId: provider.id, createdAt: order.releasedAt! }, update: {} })
    }
    if (status === 'refunded') {
      await prisma.walletMovement.upsert({ where: { id: `seed-refund-${order.id}` }, create: { id: `seed-refund-${order.id}`, walletUserId: client.id, type: 'escrow_refund', amount, reference: order.id, counterpartyUserId: provider.id, createdAt: order.cancelledAt! }, update: {} })
    }
    return order
  }

  await seedMission(clientA, providerA, 8000, 'released', 6)
  await seedMission(clientB, providerB, 15000, 'in_escrow', 1)
  await seedMission(clientD, providerA, 5000, 'delivered', 4)
  await seedMission(clientRisky, providerRisky, 6000, 'refunded', 8)
  await seedMission(clientA, providerB, 20000, 'disputed', 5, { reason: "Le travail n'a pas été terminé comme convenu.", evidence: 'Photos jointes montrant le chantier inachevé.' })
  await seedMission(clientB, providerE, 4000, 'disputed', 10, { reason: 'Prestataire injoignable après paiement.', response: "J'étais en déplacement, la prestation a bien eu lieu ensuite." })
  await seedMission(clientD, providerRisky, 12000, 'in_escrow', 6) // volontairement ancienne : alimente l'alerte "paiement bloqué"

  // --- Abonnements encaissés (Payment) ---
  const subA = await prisma.subscription.findFirst({ where: { userId: providerA.id } })
  if (subA) {
    await prisma.payment.upsert({ where: { id: `seed-payment-${providerA.id}` }, create: { id: `seed-payment-${providerA.id}`, subscriptionId: subA.id, userId: providerA.id, provider: 'flooz', phone: '90000001', amount: 13500, status: 'confirmed', createdAt: new Date(Date.now() - 10 * DAY_MS), resolvedAt: new Date(Date.now() - 10 * DAY_MS) }, update: {} })
  }
  const subE = await prisma.subscription.findFirst({ where: { userId: providerE.id } })
  if (subE) {
    await prisma.payment.upsert({ where: { id: `seed-payment-failed-${providerE.id}` }, create: { id: `seed-payment-failed-${providerE.id}`, subscriptionId: subE.id, userId: providerE.id, provider: 'tmoney', phone: '90000005', amount: 5000, status: 'failed', createdAt: new Date(Date.now() - 2 * DAY_MS) }, update: {} })
  }

  // --- Recharge portefeuille échouée (démo « rejouer ») ---
  await prisma.walletRecharge.upsert({ where: { id: 'seed-recharge-failed' }, create: { id: 'seed-recharge-failed', userId: clientA.id, provider: 'flooz', phone: '91000001', amount: 5000, status: 'failed', createdAt: new Date(Date.now() - DAY_MS) }, update: {} })

  // --- Réclamations & tentatives de contournement (anti-désintermédiation) ---
  await prisma.complaint.createMany({ data: [
    { category: 'paiement', subject: 'Paiement non débloqué', message: 'Ma prestation est terminée mais je ne vois pas les fonds.', contactEmail: 'kossi.m@example.tg', userId: providerA.id },
    { category: 'compte', subject: 'Impossible de me connecter', message: "J'ai un souci de connexion depuis hier.", contactEmail: 'nadia.s@example.tg', userId: clientA.id },
  ] })

  await prisma.contournementAttempt.createMany({ data: [
    { conversationId: 'seed-conv-risky-1', userId: providerRisky.id, reason: 'phone', excerpt: 'Appelle-moi direct au 90 00 00 03 pour qu’on s’arrange sans passer par le site.' },
    { conversationId: 'seed-conv-risky-2', userId: providerRisky.id, reason: 'off_platform_mention', excerpt: 'On peut faire ça cash, en dehors du site, ce sera moins cher.' },
    { conversationId: 'seed-conv-risky-3', userId: providerRisky.id, reason: 'email', excerpt: 'Écris-moi à kutor.pro@gmail.com pour la suite.' },
  ] })

  // --- Avis publics (page d'accueil) ---
  await prisma.testimonial.createMany({ data: [
    { name: 'Nadia S.', role: 'Chercheuse', message: 'Service rapide et prestataire vérifié, je recommande !', rating: 5 },
    { name: 'Kossi M.', role: 'Prestataire', message: "L'abonnement se rentabilise vite grâce aux demandes reçues.", rating: 4 },
  ] })

  // --- Notifications ---
  await prisma.notification.create({ data: { userId: providerA.id, type: 'new_message', title: 'Nouveau message', body: 'Vous avez reçu un nouveau message.' } })

  // --- Parrainage ---
  await prisma.referral.upsert({ where: { referredId: clientD.id }, create: { referrerId: clientA.id, referredId: clientD.id, status: 'pending' }, update: {} })

  console.log('Seed terminé.')
  console.log('Comptes de test (mot de passe Password1! sauf admin) :')
  for (const user of [...providers, ...clients]) {
    console.log(`  - ${user.role.padEnd(12)} ${user.contact}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
