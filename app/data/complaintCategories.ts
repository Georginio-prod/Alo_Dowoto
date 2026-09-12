export type ComplaintCategory = 'prestataire' | 'chercheur' | 'paiement' | 'compte' | 'technique' | 'autre'

/** Valeurs brutes (validation serveur, les schémas de validation de l'API) — jamais affichées telles quelles, donc non concernées par la traduction des libellés ci-dessous. */
export const COMPLAINT_CATEGORY_VALUES: ComplaintCategory[] = [
  'prestataire', 'chercheur', 'paiement', 'compte', 'technique', 'autre',
]

/** Contenu piloté par les clés `complaintCategories.*` (#i18n), même principe que app/data/plans.ts. */
export function getComplaintCategories(
  t: (key: string) => string,
  // Parcours d'abonnement masqué (voir useSubscriptionFeature) : le libellé
  // « Paiement ou abonnement » devient « Paiement » ; la valeur brute reste.
  { subscriptionEnabled = true }: { subscriptionEnabled?: boolean } = {},
): { value: ComplaintCategory; label: string }[] {
  return [
    { value: 'prestataire', label: t('complaintCategories.prestataire') },
    { value: 'chercheur', label: t('complaintCategories.chercheur') },
    { value: 'paiement', label: t(subscriptionEnabled ? 'complaintCategories.paiement' : 'complaintCategories.paiementNoSubscription') },
    { value: 'compte', label: t('complaintCategories.compte') },
    { value: 'technique', label: t('complaintCategories.technique') },
    { value: 'autre', label: t('complaintCategories.autre') },
  ]
}
