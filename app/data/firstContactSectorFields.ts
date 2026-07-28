/**
 * Champs additionnels de la fiche de première prise de contact (#129),
 * différenciés par secteur d'activité du prestataire (#295). Un secteur
 * absent de cette table utilise le formulaire générique (description,
 * contact, urgence) sans champ supplémentaire.
 *
 * Contenu piloté par les clés `firstContactSectorFields.*` (#i18n), comme
 * app/data/plans.ts et app/data/faq.ts — `getSectorFields` prend le `t`
 * réactif de useI18n en paramètre plutôt que du texte français en dur.
 * `getSectorFieldsFr` sert à server/api/conversations/[id]/first-contact.post.ts
 * (util serveur Nitro pur, sans contexte vue-i18n, qui valide/journalise
 * toujours en français) exactement comme `getFaqCategoriesFr` pour la FAQ.
 */
import frMessages from '~~/i18n/locales/fr.json'

export interface SectorFieldOption {
  value: string
  label: string
}

export interface SectorField {
  key: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: SectorFieldOption[]
  required: boolean
}

export function getSectorFields(sectorSlug: string | null | undefined, t: (key: string) => string): SectorField[] {
  const builders: Record<string, () => SectorField[]> = {
    btp: () => [
      {
        key: 'interventionType',
        label: t('firstContactSectorFields.btpInterventionTypeLabel'),
        type: 'select',
        required: true,
        options: [
          { value: 'devis', label: t('firstContactSectorFields.btpInterventionTypeDevis') },
          { value: 'reparation', label: t('firstContactSectorFields.btpInterventionTypeReparation') },
          { value: 'installation', label: t('firstContactSectorFields.btpInterventionTypeInstallation') },
        ],
      },
      {
        key: 'address',
        label: t('firstContactSectorFields.btpAddressLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.addressPlaceholder'),
        required: true,
      },
    ],
    menage: () => [
      {
        key: 'frequency',
        label: t('firstContactSectorFields.menageFrequencyLabel'),
        type: 'select',
        required: true,
        options: [
          { value: 'ponctuelle', label: t('firstContactSectorFields.menageFrequencyPonctuelle') },
          { value: 'hebdomadaire', label: t('firstContactSectorFields.menageFrequencyHebdomadaire') },
          { value: 'mensuelle', label: t('firstContactSectorFields.menageFrequencyMensuelle') },
        ],
      },
      {
        key: 'address',
        label: t('firstContactSectorFields.menageAddressLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.addressPlaceholder'),
        required: true,
      },
    ],
    transport: () => [
      {
        key: 'pickupAddress',
        label: t('firstContactSectorFields.transportPickupLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.addressPlaceholder'),
        required: true,
      },
      {
        key: 'dropoffAddress',
        label: t('firstContactSectorFields.transportDropoffLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.addressPlaceholder'),
        required: true,
      },
    ],
    evenement: () => [
      {
        key: 'eventDate',
        label: t('firstContactSectorFields.evenementDateLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.evenementDatePlaceholder'),
        required: true,
      },
      {
        key: 'guestCount',
        label: t('firstContactSectorFields.evenementGuestCountLabel'),
        type: 'text',
        placeholder: t('firstContactSectorFields.evenementGuestCountPlaceholder'),
        required: false,
      },
    ],
  }

  if (!sectorSlug) return []
  return builders[sectorSlug]?.() ?? []
}

function frLookup(key: string): string {
  const value = key.split('.').reduce<unknown>((node, segment) => {
    return typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[segment] : undefined
  }, frMessages)
  return typeof value === 'string' ? value : key
}

/** Champs toujours en français, pour le serveur (voir server/api/conversations/[id]/first-contact.post.ts). */
export function getSectorFieldsFr(sectorSlug: string | null | undefined): SectorField[] {
  return getSectorFields(sectorSlug, frLookup)
}
