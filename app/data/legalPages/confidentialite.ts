import { COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

export const CONFIDENTIALITE: LegalPage = {
  slug: 'confidentialite',
  title: 'Politique de confidentialité',
  intro: `${COMPANY_NAME} attache une grande importance à la protection de vos données personnelles. Cette politique explique quelles données nous collectons, pourquoi, et quels sont vos droits.`,
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: 'Responsable du traitement',
      body: [
        `Le responsable du traitement des données personnelles collectées sur WorkTogo est ${COMPANY_NAME}, joignable à ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'Données que nous collectons',
      body: ['Selon votre usage du service, nous pouvons collecter :'],
      list: [
        'Données d\'identification : nom, numéro de téléphone, adresse email, mot de passe (stocké de façon chiffrée) ;',
        'Données de profil : secteur d\'activité, description, zone d\'intervention, tarifs indicatifs, photo (pour les prestataires) ;',
        'Données de géolocalisation : position GPS précise si vous l\'autorisez explicitement (bouton dédié, jamais activée automatiquement), ou quartier/ville renseigné manuellement — voir la section « Géolocalisation » ci-dessous ;',
        'Données de vérification d\'identité : photo de la carte d\'identité et photo passeport, télé-versées volontairement pour certifier votre compte (chercheur ou prestataire) — jamais affichées aux autres utilisateurs ;',
        'Données d\'usage : messages échangés via la messagerie, demandes de contact, avis et notations, favoris, questions posées à l\'assistant conversationnel (voir « Assistant IA » ci-dessous) ;',
        'Données de paiement : références de transaction Mobile Money liées à un abonnement (WorkTogo ne stocke aucun code secret ou identifiant Mobile Money) ;',
        'Données techniques : cookies et identifiants de session nécessaires au fonctionnement du service (voir la page Cookies).',
      ],
    },
    {
      heading: 'Finalités du traitement',
      body: ['Vos données sont utilisées pour :'],
      list: [
        'Créer et gérer votre compte et vous authentifier ;',
        'Permettre la mise en relation entre chercheurs et prestataires ;',
        'Certifier l\'identité des comptes (badge « Vérifié »), requis avant la première demande d\'un chercheur ou le premier contact reçu par un prestataire ;',
        'Afficher les profils, avis et notations sur la plateforme ;',
        'Gérer les abonnements et paiements des prestataires ;',
        'Assurer le support, traiter vos réclamations et répondre à vos demandes ;',
        'Améliorer la sécurité et le bon fonctionnement du service.',
      ],
    },
    {
      heading: 'Base légale des traitements',
      body: [
        'Les traitements de données personnelles réalisés sur WorkTogo sont soumis à la loi togolaise n° 2019-014 du 29 octobre 2019 relative à la protection des données à caractère personnel, sous le contrôle de l\'Instance de Protection des Données à Caractère Personnel (IPDCP).',
        'Les traitements décrits ci-dessus reposent sur l\'exécution du contrat qui vous lie à WorkTogo (fourniture du service), sur votre consentement lorsqu\'il est requis (cookies non essentiels), ou sur l\'intérêt légitime de WorkTogo à assurer la sécurité et l\'amélioration de la plateforme.',
      ],
    },
    {
      heading: 'Géolocalisation',
      body: [
        'WorkTogo propose une recherche de prestataires par proximité (« à moins de X km »), centrée sur Lomé et la Région Maritime. Votre position précise n\'est jamais collectée automatiquement : elle n\'est transmise que si vous cliquez explicitement sur un bouton « Utiliser ma position actuelle », qui déclenche la demande d\'autorisation native de votre navigateur. Vous pouvez à tout moment refuser cette autorisation et rechercher par quartier ou par ville à la place — la recherche reste entièrement utilisable sans jamais partager votre position.',
        'Par défaut, la position enregistrée sur la fiche d\'un prestataire n\'est jamais affichée publiquement au degré de précision exact : seul son quartier (ou une position approchée à quelques centaines de mètres) est visible par les autres utilisateurs, sauf si le prestataire choisit explicitement d\'afficher une position précise (« position approximative » désactivée depuis son profil).',
        'Vous pouvez supprimer à tout moment la position précise enregistrée sur votre compte, sans supprimer votre compte lui-même, depuis la section « Identité » de votre profil (bouton « Supprimer ma position enregistrée »).',
        'Lorsque vous utilisez la géolocalisation, une conversion optionnelle de vos coordonnées en nom de quartier peut être effectuée auprès d\'OpenStreetMap/Nominatim (service de cartographie ouvert) : voir la section « Partage des données » ci-dessous.',
      ],
    },
    {
      heading: 'Assistant IA',
      body: [
        'WorkTogo propose un assistant conversationnel destiné à répondre à vos questions sur la plateforme et à vous recommander de vrais prestataires inscrits. Il s\'agit d\'une intelligence artificielle, jamais d\'un humain — l\'assistant vous le rappelle sur demande, et un lien vers le support humain reste toujours accessible dans le widget.',
        'Les messages que vous envoyez à l\'assistant, ainsi que votre position si vous l\'avez fournie à la recherche, sont transmis à notre fournisseur d\'intelligence artificielle (Anthropic, société tierce) pour générer une réponse — voir « Partage des données » ci-dessous. L\'assistant ne recommande jamais un prestataire fictif : ses réponses s\'appuient uniquement sur les fiches réellement inscrites sur WorkTogo.',
        'Un court historique de conversation est conservé pour donner du contexte à l\'assistant d\'un message à l\'autre (voir « Durée de conservation »). Si l\'assistant n\'est pas disponible, la plateforme reste utilisable normalement via la recherche classique et la page FAQ.',
      ],
    },
    {
      heading: 'Partage des données',
      body: [
        'Vos données de profil (nom, secteur, avis, notation) sont visibles par les autres utilisateurs dans le cadre normal du service de mise en relation. La carte d\'identité et la photo passeport télé-versées pour la vérification ne sont en revanche jamais partagées avec d\'autres utilisateurs : seul le résultat (compte vérifié ou non) est visible. WorkTogo ne vend ni ne loue vos données personnelles à des tiers à des fins commerciales.',
        'Vos données peuvent être communiquées à des prestataires techniques strictement nécessaires au fonctionnement du service (hébergement, envoi de codes de vérification, traitement des paiements Mobile Money), tenus à une obligation de confidentialité, ou aux autorités compétentes lorsque la loi togolaise l\'exige.',
        'Deux prestataires techniques supplémentaires interviennent pour les fonctionnalités de géolocalisation et d\'assistant IA décrites ci-dessus : OpenStreetMap/Nominatim (conversion de coordonnées GPS en nom de quartier, appelée directement depuis votre navigateur, sans compte ni identifiant WorkTogo transmis) et Anthropic (génération des réponses de l\'assistant conversationnel, à partir des seuls messages que vous lui adressez).',
      ],
    },
    {
      heading: 'Durée de conservation',
      body: ['Les durées de conservation varient selon la nature de la donnée :'],
      list: [
        'Données de compte (identité, profil, messages, avis) : pendant toute la durée de vie de votre compte, puis effacées ou anonymisées dans un délai raisonnable après sa clôture ;',
        'Pièces d\'identité de vérification (carte d\'identité, photo passeport) : les images elles-mêmes sont automatiquement effacées 90 jours après leur soumission — seul le statut « Vérifié » de votre compte est conservé, sans que les documents ne soient conservés indéfiniment ;',
        'Position GPS précise : conservée jusqu\'à ce que vous la supprimiez vous-même (voir « Géolocalisation » ci-dessus) ou que vous supprimiez votre compte — elle n\'expire pas automatiquement, car son utilité (recherche par distance) ne diminue pas avec le temps tant que vous n\'avez pas déménagé ;',
        'Historique de conversation avec l\'assistant IA : conservé le temps de la session de discussion en cours, pour donner du contexte à l\'assistant d\'un message à l\'autre, puis effacé automatiquement au-delà d\'un nombre limité d\'échanges récents ;',
        'Données de paiement et d\'abonnement : conservées au-delà de la clôture du compte lorsque la loi togolaise l\'exige à des fins comptables et fiscales, même si votre compte est supprimé ou anonymisé entre-temps ;',
        'Cookies et données techniques : voir les durées indiquées dans notre page Gestion des cookies.',
      ],
    },
    {
      heading: 'Sécurité des données',
      body: [
        'WorkTogo met en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données contre la perte, l\'accès non autorisé ou la divulgation : mots de passe chiffrés (jamais stockés en clair), sessions authentifiées par cookie sécurisé, accès aux pièces de vérification d\'identité strictement limité à leur titulaire, et effacement automatique de ces pièces une fois le délai de conservation ci-dessus dépassé.',
        'Un audit de sécurité du stockage des données les plus sensibles (pièces d\'identité, localisation, historique de paiement) a été réalisé et donne lieu à des améliorations continues à mesure que la plateforme évolue.',
      ],
    },
    {
      heading: 'Vos droits',
      body: ['Conformément à la loi togolaise n° 2019-014 relative à la protection des données à caractère personnel, vous disposez des droits suivants sur vos données :'],
      list: [
        'Droit d\'accès et à la portabilité : téléchargez à tout moment une copie structurée de vos données depuis votre profil (section « Mes données ») ;',
        'Droit de rectification : corriger des données inexactes ou incomplètes depuis votre profil ;',
        'Droit d\'effacement : supprimer votre compte directement depuis votre profil (section « Mes données ») — vos données identifiantes sont alors effacées, sous réserve des obligations légales de conservation mentionnées ci-dessus ;',
        'Droit d\'opposition : vous opposer, pour un motif légitime, à un traitement de vos données ;',
      ],
    },
    {
      heading: 'Exercer vos droits',
      body: [
        'Le téléchargement de vos données et la suppression de votre compte sont accessibles en libre-service depuis votre profil WorkTogo (section « Mes données »), sans attendre de réponse manuelle.',
        `Pour toute autre demande relative à vos données (droit de rectification approfondi, droit d'opposition, question sur cette politique), contactez-nous à ${SUPPORT_EMAIL} ou au ${SUPPORT_PHONE}. Une réponse vous sera apportée dans les meilleurs délais.`,
        'Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de l\'Instance de Protection des Données à Caractère Personnel (IPDCP), autorité de contrôle compétente au Togo.',
      ],
    },
    {
      heading: 'Cookies',
      body: [
        'WorkTogo utilise des cookies strictement nécessaires au fonctionnement du service. Le détail de ces cookies et la manière de les gérer sont décrits dans notre page Gestion des cookies.',
      ],
    },
    {
      heading: 'Mineurs',
      body: [
        'WorkTogo n\'est pas destiné aux personnes mineures. Nous ne collectons pas sciemment de données concernant des mineurs.',
      ],
    },
    {
      heading: 'Modification de cette politique',
      body: [
        'Cette politique peut être mise à jour pour refléter des évolutions du service ou de la réglementation applicable. La date de dernière mise à jour figure en haut de cette page.',
      ],
    },
  ],
}
