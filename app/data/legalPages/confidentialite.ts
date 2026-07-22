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
        'Données de vérification d\'identité : photo de la carte d\'identité et photo passeport, télé-versées volontairement pour certifier votre compte (chercheur ou prestataire) — jamais affichées aux autres utilisateurs ;',
        'Données d\'usage : messages échangés via la messagerie, demandes de contact, avis et notations, favoris ;',
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
      heading: 'Partage des données',
      body: [
        'Vos données de profil (nom, secteur, avis, notation) sont visibles par les autres utilisateurs dans le cadre normal du service de mise en relation. La carte d\'identité et la photo passeport télé-versées pour la vérification ne sont en revanche jamais partagées avec d\'autres utilisateurs : seul le résultat (compte vérifié ou non) est visible. WorkTogo ne vend ni ne loue vos données personnelles à des tiers à des fins commerciales.',
        'Vos données peuvent être communiquées à des prestataires techniques strictement nécessaires au fonctionnement du service (hébergement, envoi de codes de vérification, traitement des paiements Mobile Money), tenus à une obligation de confidentialité, ou aux autorités compétentes lorsque la loi togolaise l\'exige.',
      ],
    },
    {
      heading: 'Durée de conservation',
      body: ['Les durées de conservation varient selon la nature de la donnée :'],
      list: [
        'Données de compte (identité, profil, messages, avis) : pendant toute la durée de vie de votre compte, puis effacées ou anonymisées dans un délai raisonnable après sa clôture ;',
        'Pièces d\'identité de vérification (carte d\'identité, photo passeport) : les images elles-mêmes sont automatiquement effacées 90 jours après leur soumission — seul le statut « Vérifié » de votre compte est conservé, sans que les documents ne soient conservés indéfiniment ;',
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
