/**
 * Champs additionnels de la fiche de première prise de contact (#129),
 * différenciés par secteur d'activité du prestataire (#295). Un secteur
 * absent de cette table utilise le formulaire générique (description,
 * contact, urgence) sans champ supplémentaire.
 */

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

export const FIRST_CONTACT_SECTOR_FIELDS: Record<string, SectorField[]> = {
  btp: [
    {
      key: 'interventionType',
      label: "Type d'intervention",
      type: 'select',
      required: true,
      options: [
        { value: 'devis', label: 'Devis / diagnostic' },
        { value: 'reparation', label: 'Réparation / dépannage' },
        { value: 'installation', label: 'Installation neuve' },
      ],
    },
    {
      key: 'address',
      label: "Adresse d'intervention",
      type: 'text',
      placeholder: 'Quartier, ville…',
      required: true,
    },
  ],
  menage: [
    {
      key: 'frequency',
      label: 'Fréquence souhaitée',
      type: 'select',
      required: true,
      options: [
        { value: 'ponctuelle', label: 'Ponctuelle' },
        { value: 'hebdomadaire', label: 'Hebdomadaire' },
        { value: 'mensuelle', label: 'Mensuelle' },
      ],
    },
    {
      key: 'address',
      label: 'Adresse du domicile',
      type: 'text',
      placeholder: 'Quartier, ville…',
      required: true,
    },
  ],
  transport: [
    {
      key: 'pickupAddress',
      label: 'Adresse de départ',
      type: 'text',
      placeholder: 'Quartier, ville…',
      required: true,
    },
    {
      key: 'dropoffAddress',
      label: "Adresse d'arrivée",
      type: 'text',
      placeholder: 'Quartier, ville…',
      required: true,
    },
  ],
  evenement: [
    {
      key: 'eventDate',
      label: "Date de l'événement",
      type: 'text',
      placeholder: 'jj/mm/aaaa',
      required: true,
    },
    {
      key: 'guestCount',
      label: "Nombre d'invités estimé",
      type: 'text',
      placeholder: 'Ex. 50',
      required: false,
    },
  ],
}

export function getSectorFields(sectorSlug: string | null | undefined): SectorField[] {
  if (!sectorSlug) return []
  return FIRST_CONTACT_SECTOR_FIELDS[sectorSlug] ?? []
}
