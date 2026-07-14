import type { LegalPage } from './types'

export const A_PROPOS: LegalPage = {
  slug: 'a-propos',
  title: 'Qui sommes-nous',
  intro: 'WorkTogo met en relation les Togolaises et Togolais avec des prestataires de services vérifiés, dans tous les secteurs d\'activité.',
  sections: [
    {
      heading: 'Notre mission',
      body: [
        'Faciliter l\'accès à des professionnels de confiance — artisanat, BTP, informatique, ménage, beauté, événementiel et bien d\'autres — partout au Togo.',
        'Permettre à chaque prestataire indépendant de développer son activité en recevant des demandes qualifiées près de chez lui.',
      ],
    },
    {
      heading: 'Comment ça marche',
      body: [
        'Un chercheur décrit son besoin ou parcourt les secteurs, compare les profils vérifiés et contacte directement le prestataire de son choix.',
        'Une fois la collaboration terminée, les deux parties peuvent se noter mutuellement pour renforcer la confiance sur la plateforme.',
      ],
    },
  ],
}
