/**
 * Anneau de complétion et « prochaine section incomplète » du hub `/profil`
 * — extrait de app/pages/profil.vue (au-delà de la limite ESLint max-lines
 * après l'ajout des sections « Mes données » (#286) et « Disponibilité »
 * (#290)) pour rester un composable pur, sans dépendance au type `ModalKey`
 * propre à cette page : chaque entrée de `sections` porte sa propre clé
 * (une chaîne quelconque), la page appelante fait le lien avec ses propres
 * clés de modale.
 */

export interface ProfileCompletionSection {
  key: string
  complete: ComputedRef<boolean> | Ref<boolean>
}

export function useProfileCompletion(input: {
  baseSections: ProfileCompletionSection[]
  providerSections: ProfileCompletionSection[]
  isProvider: ComputedRef<boolean> | Ref<boolean>
  subscriptionActive: ComputedRef<boolean> | Ref<boolean>
}) {
  const sections = computed<ProfileCompletionSection[]>(() =>
    input.isProvider.value ? [...input.baseSections, ...input.providerSections] : input.baseSections,
  )

  const completionPercent = computed(() => {
    const total = sections.value.length
    const done = sections.value.filter((section) => section.complete.value).length
    return total === 0 ? 0 : Math.round((done / total) * 100)
  })
  const remainingCount = computed(() => sections.value.filter((section) => !section.complete.value).length)

  // Anneau SVG (stroke-dasharray) : circonférence d'un cercle de rayon 34.
  const RING_CIRCUMFERENCE = 2 * Math.PI * 34
  const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - completionPercent.value / 100))

  /** Première section incomplète (prestataire uniquement), ou `null` si tout est complet — l'abonnement est vérifié à part par l'appelant. */
  const firstIncompleteProviderSection = computed<string | null>(() => {
    if (!input.isProvider.value) return null
    const next = input.providerSections.find((section) => !section.complete.value)
    return next?.key ?? null
  })

  return { completionPercent, remainingCount, RING_CIRCUMFERENCE, ringOffset, firstIncompleteProviderSection }
}
