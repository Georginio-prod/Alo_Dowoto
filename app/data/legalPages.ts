export interface LegalSection {
  heading: string
  body: string[]
}

export interface LegalPage {
  slug: string
  title: string
  intro: string
  sections: LegalSection[]
}

/**
 * Contenu des pages « À propos »/légales liées depuis AppFooter (#132).
 * Contenu générique de prototype (pas de texte juridique validé) — à
 * remplacer par les mentions réelles avant mise en production.
 */
export const LEGAL_PAGES: LegalPage[] = [
  {
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
  },
  {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    intro: 'Informations relatives à l\'édition et à l\'hébergement de la plateforme WorkTogo.',
    sections: [
      {
        heading: 'Éditeur',
        body: ['WorkTogo — plateforme de mise en relation entre chercheurs et prestataires de services au Togo.'],
      },
      {
        heading: 'Hébergement',
        body: ['Les informations d\'hébergement seront précisées avant la mise en production du service.'],
      },
    ],
  },
  {
    slug: 'cgu',
    title: 'Conditions générales d\'utilisation',
    intro: 'En utilisant WorkTogo, vous acceptez les présentes conditions générales d\'utilisation.',
    sections: [
      {
        heading: 'Objet du service',
        body: ['WorkTogo est une plateforme de mise en relation. Elle n\'est pas partie aux prestations convenues entre chercheurs et prestataires.'],
      },
      {
        heading: 'Comptes et responsabilités',
        body: [
          'Chaque utilisateur est responsable de l\'exactitude des informations fournies lors de son inscription et de la confidentialité de son mot de passe.',
          'Les prestataires s\'engagent à fournir des informations sincères sur leur activité, leurs compétences et leurs tarifs.',
        ],
      },
    ],
  },
  {
    slug: 'confidentialite',
    title: 'Politique de confidentialité',
    intro: 'WorkTogo attache une importance particulière à la protection des données personnelles de ses utilisateurs.',
    sections: [
      {
        heading: 'Données collectées',
        body: ['Coordonnées de contact, informations de profil et échanges nécessaires à la mise en relation entre chercheurs et prestataires.'],
      },
      {
        heading: 'Utilisation des données',
        body: ['Les données ne sont utilisées que pour le fonctionnement du service (mise en relation, messagerie, notation) et ne sont pas revendues à des tiers.'],
      },
    ],
  },
  {
    slug: 'cookies',
    title: 'Gestion des cookies',
    intro: 'WorkTogo utilise des cookies essentiels au fonctionnement du service (ex. maintien de la session connectée).',
    sections: [
      {
        heading: 'Cookies utilisés',
        body: ['Un cookie de session, nécessaire pour rester connecté entre deux visites, est déposé après connexion. Aucun cookie publicitaire n\'est utilisé.'],
      },
    ],
  },
]

export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((page) => page.slug === slug)
}
