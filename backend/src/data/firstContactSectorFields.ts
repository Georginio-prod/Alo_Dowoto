/**
 * Champs additionnels de la fiche de première prise de contact (#129),
 * différenciés par secteur d'activité du prestataire (#295). Porté depuis
 * `app/data/firstContactSectorFields.ts` + `i18n/locales/fr.json` (ADR-0016) :
 * le backend est standalone (n'importe pas le code de l'app), donc les libellés
 * FR (clés `firstContactSectorFields.*`) sont **copiés** ici — à garder
 * synchronisé avec `i18n/locales/fr.json`. Le serveur valide/journalise
 * toujours en français (comme `getSectorFieldsFr` côté Nitro). Un secteur
 * absent utilise le formulaire générique (aucun champ supplémentaire).
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

/** Champs toujours en français, pour le serveur (voir first-contact). Iso `getSectorFieldsFr`. */
export function getSectorFieldsFr(sectorSlug: string | null | undefined): SectorField[] {
  const builders: Record<string, () => SectorField[]> = {
    btp: () => [
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
    menage: () => [
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
    transport: () => [
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
    evenement: () => [
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

  if (!sectorSlug) return []
  return builders[sectorSlug]?.() ?? []
}
