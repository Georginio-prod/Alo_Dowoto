/**
 * Signal démonstratif (#dashboard-admin, module 9) — « chercheurs qui
 * consultent une fiche prestataire sans jamais payer d'avance ». Aucune
 * consultation de fiche prestataire n'est journalisée aujourd'hui (pas de
 * table de vues/analytics dans le schéma) : ce signal n'a donc, à ce jour,
 * aucune source de données réelle.
 *
 * TODO: brancher sur une vraie source — par exemple journaliser une ligne à
 * chaque `GET /api/providers/:id` (server/utils/providerDirectory.ts,
 * getProviderDetail) dans une nouvelle table `ProfileView`, puis calculer ici
 * le ratio consultations/avances payées par chercheur.
 */

export interface DemoBrowseWithoutPaySignal {
  clientId: string
  clientName: string
  viewsCount: number
  paidAdvancesCount: number
}

/** Données de démonstration — jamais lues depuis une vraie table. */
export function getDemoBrowseWithoutPaySignals(): DemoBrowseWithoutPaySignal[] {
  return [
    { clientId: 'demo-client-1', clientName: 'Chercheur démo A', viewsCount: 14, paidAdvancesCount: 0 },
    { clientId: 'demo-client-2', clientName: 'Chercheur démo B', viewsCount: 9, paidAdvancesCount: 0 },
  ]
}
