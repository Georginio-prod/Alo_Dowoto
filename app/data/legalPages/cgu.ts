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
        'Le prestataire reste seul responsable et libre dans l\'exercice de son activité : il fixe lui-même son tarif indicatif, décide de ses disponibilités, et conserve à tout moment la faculté de refuser ou d\'annuler une demande avant le début de son exécution, sans pénalité ni justification autre que le motif requis par la procédure d\'annulation. WorkTogo ne lui impose ni horaires, ni exclusivité, ni méthode d\'exécution de la prestation.',
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
      heading: '8. Paiement intégral des prestations via la plateforme',
      body: [
        'Le prix de toute prestation mise en relation via WorkTogo doit être réglé intégralement — sans acompte ni solde résiduel réglé séparément — au moyen du système de paiement en séquestre de la plateforme, avant le début de l\'intervention. Aucune partie du montant convenu ne peut être réglée en espèces ou par tout autre moyen hors plateforme entre le chercheur et le prestataire.',
        'Cette règle protège le chercheur, dont les fonds restent bloqués en séquestre jusqu\'à validation de la prestation, et le prestataire, dont le paiement est garanti dès la mise en séquestre. Elle s\'applique à l\'intégralité du montant convenu, y compris en cas de modification du périmètre de la prestation en cours d\'intervention.',
      ],
    },
    {
      heading: '9. Garantie de paiement, assurance et mise en avant',
      body: [
        'La garantie de paiement (fonds du chercheur sécurisés en séquestre jusqu\'à validation de la prestation), toute couverture d\'assurance responsabilité civile associée à une intervention, ainsi que la mise en avant en tête des résultats de recherche liée à la formule d\'abonnement souscrite, ne bénéficient qu\'aux prestations intégralement enregistrées et payées via le système de paiement de la plateforme.',
        'Aucun de ces avantages n\'est activable ni opposable à WorkTogo pour une prestation convenue, réalisée ou réglée en tout ou partie en dehors de la plateforme, y compris lorsque la mise en relation initiale a eu lieu via WorkTogo.',
      ],
    },
    {
      heading: '10. Avis et notation',
      body: [
        'À l\'issue d\'une collaboration, chercheur et prestataire peuvent se noter mutuellement et laisser un commentaire. Les avis doivent refléter une expérience réelle et vécue ; tout avis mensonger, diffamatoire ou publié en échange d\'un avantage est interdit et peut être supprimé.',
        'WorkTogo se réserve le droit de modérer ou retirer un avis manifestement contraire aux présentes CGU, sans obligation de justification préalable.',
      ],
    },
    {
      heading: '11. Comportements interdits',
      body: ['Il est interdit à tout utilisateur de :'],
      list: [
        'Fournir de fausses informations d\'identité, de compétence ou de tarification ;',
        'Utiliser la plateforme à des fins illicites, frauduleuses ou de démarchage non sollicité ;',
        'Contourner la messagerie ou les quotas par la création de comptes multiples ;',
        'Régler ou accepter de régler tout ou partie du prix d\'une prestation en espèces ou par tout autre moyen hors plateforme, en contournement de l\'article 8 ;',
        'Publier un contenu injurieux, discriminatoire, diffamatoire ou portant atteinte aux droits d\'un tiers ;',
        'Tenter d\'accéder sans autorisation aux systèmes, comptes ou données d\'autrui.',
      ],
    },
    {
      heading: '12. Propriété intellectuelle',
      body: [
        'Les éléments de la plateforme (marque, logo, interface, code) sont protégés par le droit de la propriété intellectuelle et ne peuvent être reproduits sans autorisation. Chaque utilisateur reste propriétaire des contenus qu\'il publie et garantit disposer des droits nécessaires à leur publication.',
      ],
    },
    {
      heading: '13. Données personnelles',
      body: [
        'Le traitement des données personnelles des utilisateurs est décrit dans la Politique de confidentialité, qui fait partie intégrante des présentes CGU.',
      ],
    },
    {
      heading: '14. Responsabilité et garanties',
      body: [
        'WorkTogo s\'efforce d\'assurer l\'exactitude des informations affichées et la disponibilité du service, sans garantie de résultat. WorkTogo ne saurait être tenue responsable de la qualité, de la conformité ou de la bonne exécution des prestations convenues entre un chercheur et un prestataire, ni des dommages résultant de leur relation.',
        'WorkTogo ne peut garantir un fonctionnement du service exempt de toute interruption, erreur ou anomalie technique, et met en œuvre des moyens raisonnables pour y remédier dans des délais adaptés.',
      ],
    },
    {
      heading: '15. Suspension, résiliation et suppression de compte',
      body: [
        'Tout utilisateur peut demander la clôture de son compte à tout moment en contactant le support. WorkTogo peut suspendre ou résilier un compte, avec ou sans préavis selon la gravité des faits, en cas de manquement aux présentes CGU, notamment aux comportements interdits listés à l\'article 11.',
        'Sauf urgence ou récidive, la sanction est graduée : avertissement, puis suspension temporaire, puis résiliation définitive. Un contournement avéré de la plateforme (article 11) — notamment le fait d\'organiser ou d\'accepter un règlement hors plateforme après une mise en relation initiée sur WorkTogo — peut donner lieu à une suspension ou résiliation immédiate, sans préavis ni remboursement des sommes déjà engagées (abonnement en cours, frais de service), et sans préjudice d\'une éventuelle action en réparation du préjudice subi par WorkTogo.',
        'Tout utilisateur peut signaler un contournement suspecté depuis l\'application ou auprès du support. Chaque signalement, ainsi que les tentatives détectées automatiquement par la plateforme, fait l\'objet d\'une vérification par l\'équipe support avant toute sanction — aucune sanction n\'est appliquée sur la seule base d\'une détection automatique non vérifiée par une personne.',
      ],
    },
    {
      heading: '16. Géolocalisation',
      body: [
        'WorkTogo propose une recherche de prestataires par proximité géographique, centrée sur Lomé et la Région Maritime. Cette fonctionnalité repose sur une position que l\'utilisateur transmet volontairement (autorisation de géolocalisation de son navigateur) ou renseigne manuellement (quartier, ville) ; elle n\'est jamais activée sans action explicite de l\'utilisateur et n\'est jamais requise pour utiliser le reste du service.',
        'Un prestataire reste libre de choisir le niveau de précision de la position affichée publiquement sur sa fiche (quartier ou position précise) et peut supprimer à tout moment la position enregistrée sur son compte, chercheur comme prestataire, comme décrit dans la Politique de confidentialité.',
      ],
    },
    {
      heading: '17. Assistant conversationnel (IA)',
      body: [
        'WorkTogo met à disposition un assistant conversationnel automatisé, destiné à répondre aux questions sur le fonctionnement de la plateforme et à orienter l\'utilisateur vers de vrais prestataires inscrits. Il s\'agit d\'un outil d\'intelligence artificielle, qui ne se substitue pas au support humain, accessible à tout moment.',
        'Les recommandations de l\'assistant s\'appuient exclusivement sur des données réelles de la plateforme (profils effectivement inscrits) ; elles ne constituent en rien un engagement contractuel de WorkTogo ni une garantie de disponibilité, de compétence ou de tarif du prestataire recommandé, qui restent régis par les articles 4 et suivants des présentes CGU.',
        'En cas d\'indisponibilité de l\'assistant, l\'utilisateur conserve un accès complet à la recherche classique et à la messagerie.',
      ],
    },
    {
      heading: '18. Modification des CGU',
      body: [
        'WorkTogo peut modifier les présentes CGU pour tenir compte d\'évolutions du service ou de la réglementation. Les utilisateurs sont informés de toute modification substantielle ; la poursuite de l\'utilisation du service après entrée en vigueur des modifications vaut acceptation.',
      ],
    },
    {
      heading: '19. Droit applicable et règlement des litiges',
      body: [
        'Les présentes CGU sont soumises au droit togolais. En cas de litige, les parties s\'efforcent de trouver une solution amiable avant toute action contentieuse ; à défaut, les juridictions togolaises compétentes seront seules saisies.',
      ],
    },
  ],
}
