import { LAST_UPDATED, type LegalPage } from './types'

export const CGU: LegalPage = {
  slug: 'cgu',
  title: 'Conditions générales d\'utilisation',
  intro: 'Les présentes conditions générales d\'utilisation (« CGU ») régissent l\'accès et l\'utilisation de la plateforme WorkTogo par toute personne — chercheur ou prestataire. En créant un compte ou en utilisant le service, vous acceptez les présentes CGU sans réserve.',
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: '1. Objet et champ d\'application',
      body: [
        'WorkTogo est une plateforme numérique de mise en relation entre des personnes recherchant un service (« chercheurs ») et des professionnels indépendants proposant leurs services (« prestataires »), dans tous les secteurs d\'activité, partout au Togo.',
        'Les présentes CGU s\'appliquent à tout usage du site, de l\'application et des fonctionnalités associées (recherche, messagerie, avis, abonnement prestataire), à l\'exclusion de toute autre condition non expressément acceptée par WorkTogo.',
      ],
    },
    {
      heading: '2. Définitions',
      body: [],
      list: [
        '« Chercheur » : utilisateur créant un compte pour rechercher et contacter un prestataire.',
        '« Prestataire » : utilisateur indépendant créant un compte pour proposer ses services et recevoir des demandes.',
        '« Contenu » : toute information, texte, note ou message publié par un utilisateur sur la plateforme.',
        '« Mise en relation » : le fait, pour WorkTogo, de permettre à un chercheur et un prestataire d\'échanger via la messagerie intégrée.',
      ],
    },
    {
      heading: '3. Inscription et compte utilisateur',
      body: [
        'L\'inscription requiert un numéro de téléphone ou une adresse email valide, vérifié par code à usage unique, ainsi qu\'un mot de passe. L\'utilisateur choisit lors de l\'inscription s\'il agit en tant que chercheur ou prestataire ; ce rôle est définitif pour le compte créé.',
        'L\'utilisateur s\'engage à fournir des informations exactes, à jour et complètes lors de son inscription et à les maintenir à jour, ainsi qu\'à préserver la confidentialité de son mot de passe. Toute activité effectuée depuis un compte est présumée effectuée par son titulaire.',
        'L\'inscription est réservée aux personnes majeures ou légalement capables de contracter au regard du droit togolais.',
        'La vérification d\'identité (carte d\'identité et photo passeport) est facultative au moment de l\'inscription, mais devient obligatoire avant qu\'un chercheur publie sa première demande ou qu\'un prestataire puisse être contacté par un client — voir l\'article 4 ci-dessous.',
      ],
    },
    {
      heading: '4. Rôle de WorkTogo',
      body: [
        'WorkTogo agit exclusivement en qualité d\'intermédiaire technique de mise en relation. WorkTogo n\'est pas partie au contrat de prestation de service conclu, le cas échéant, entre un chercheur et un prestataire, et n\'intervient ni dans sa négociation, ni dans son exécution, ni dans son paiement.',
        'La vérification des profils (badge « Vérifié ») repose sur la carte d\'identité et la photo passeport télé-versées par l\'utilisateur, chercheur ou prestataire, et confirme uniquement la cohérence des éléments déclaratifs fournis. Elle ne constitue ni une garantie de compétence, ni une certification professionnelle, ni un contrôle d\'antécédents judiciaires.',
      ],
    },
    {
      heading: '5. Utilisation du service par les chercheurs',
      body: [
        'Les chercheurs peuvent rechercher des prestataires par secteur, comparer les profils, avis et tarifs indicatifs, et contacter gratuitement un nombre de prestataires par mois, dans la limite du quota en vigueur affiché dans l\'application.',
        'Les chercheurs s\'engagent à utiliser la messagerie de bonne foi, à ne pas solliciter les prestataires à des fins étrangères à un besoin réel de service, et à renseigner sincèrement le formulaire de première prise de contact lorsqu\'il est requis.',
      ],
    },
    {
      heading: '6. Utilisation du service par les prestataires',
      body: [
        'Les prestataires s\'engagent à décrire sincèrement leur activité, leurs compétences, leur zone d\'intervention et leurs tarifs indicatifs, et à exercer leur activité en conformité avec la réglementation togolaise applicable à leur secteur (autorisations, qualifications ou assurances éventuellement requises).',
        'La réception de demandes de contact au-delà du quota gratuit est soumise à la souscription d\'une formule d\'abonnement, décrite à l\'article suivant.',
      ],
    },
    {
      heading: '7. Abonnements et paiement',
      body: [
        'Les prestataires accèdent aux formules d\'abonnement décrites sur la page Tarification. Chaque formule précise sa durée, son prix et les fonctionnalités incluses (quota de demandes, mise en avant, badge « Vérifié », support prioritaire).',
        'Le paiement s\'effectue par Mobile Money (Flooz, T-Money). L\'abonnement prend effet à la confirmation du paiement et n\'est pas renouvelé automatiquement sans action de l\'utilisateur, sauf mention contraire affichée au moment de la souscription. Sauf disposition légale impérative contraire, les sommes versées au titre d\'une période d\'abonnement déjà commencée ne sont pas remboursables.',
      ],
    },
    {
      heading: '8. Avis et notation',
      body: [
        'À l\'issue d\'une collaboration, chercheur et prestataire peuvent se noter mutuellement et laisser un commentaire. Les avis doivent refléter une expérience réelle et vécue ; tout avis mensonger, diffamatoire ou publié en échange d\'un avantage est interdit et peut être supprimé.',
        'WorkTogo se réserve le droit de modérer ou retirer un avis manifestement contraire aux présentes CGU, sans obligation de justification préalable.',
      ],
    },
    {
      heading: '9. Comportements interdits',
      body: ['Il est interdit à tout utilisateur de :'],
      list: [
        'Fournir de fausses informations d\'identité, de compétence ou de tarification ;',
        'Utiliser la plateforme à des fins illicites, frauduleuses ou de démarchage non sollicité ;',
        'Contourner la messagerie ou les quotas par la création de comptes multiples ;',
        'Publier un contenu injurieux, discriminatoire, diffamatoire ou portant atteinte aux droits d\'un tiers ;',
        'Tenter d\'accéder sans autorisation aux systèmes, comptes ou données d\'autrui.',
      ],
    },
    {
      heading: '10. Propriété intellectuelle',
      body: [
        'Les éléments de la plateforme (marque, logo, interface, code) sont protégés par le droit de la propriété intellectuelle et ne peuvent être reproduits sans autorisation. Chaque utilisateur reste propriétaire des contenus qu\'il publie et garantit disposer des droits nécessaires à leur publication.',
      ],
    },
    {
      heading: '11. Données personnelles',
      body: [
        'Le traitement des données personnelles des utilisateurs est décrit dans la Politique de confidentialité, qui fait partie intégrante des présentes CGU.',
      ],
    },
    {
      heading: '12. Responsabilité et garanties',
      body: [
        'WorkTogo s\'efforce d\'assurer l\'exactitude des informations affichées et la disponibilité du service, sans garantie de résultat. WorkTogo ne saurait être tenue responsable de la qualité, de la conformité ou de la bonne exécution des prestations convenues entre un chercheur et un prestataire, ni des dommages résultant de leur relation.',
        'WorkTogo ne peut garantir un fonctionnement du service exempt de toute interruption, erreur ou anomalie technique, et met en œuvre des moyens raisonnables pour y remédier dans des délais adaptés.',
      ],
    },
    {
      heading: '13. Suspension, résiliation et suppression de compte',
      body: [
        'Tout utilisateur peut demander la clôture de son compte à tout moment en contactant le support. WorkTogo peut suspendre ou résilier un compte, avec ou sans préavis selon la gravité des faits, en cas de manquement aux présentes CGU, notamment aux comportements interdits listés à l\'article 9.',
      ],
    },
    {
      heading: '14. Modification des CGU',
      body: [
        'WorkTogo peut modifier les présentes CGU pour tenir compte d\'évolutions du service ou de la réglementation. Les utilisateurs sont informés de toute modification substantielle ; la poursuite de l\'utilisation du service après entrée en vigueur des modifications vaut acceptation.',
      ],
    },
    {
      heading: '15. Droit applicable et règlement des litiges',
      body: [
        'Les présentes CGU sont soumises au droit togolais. En cas de litige, les parties s\'efforcent de trouver une solution amiable avant toute action contentieuse ; à défaut, les juridictions togolaises compétentes seront seules saisies.',
      ],
    },
  ],
}
