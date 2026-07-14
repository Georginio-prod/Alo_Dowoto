export type ComplaintCategory = 'prestataire' | 'chercheur' | 'paiement' | 'compte' | 'technique' | 'autre'

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'prestataire', label: 'Problème avec un prestataire' },
  { value: 'chercheur', label: 'Problème avec un chercheur' },
  { value: 'paiement', label: 'Paiement ou abonnement' },
  { value: 'compte', label: 'Mon compte' },
  { value: 'technique', label: 'Problème technique' },
  { value: 'autre', label: 'Autre' },
]
