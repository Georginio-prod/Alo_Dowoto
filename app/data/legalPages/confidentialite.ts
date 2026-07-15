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
      body: [
        'Vos données sont conservées pendant toute la durée de vie de votre compte, puis archivées ou supprimées dans un délai raisonnable après sa clôture, sauf obligation légale de conservation plus longue (notamment en matière comptable et fiscale).',
      ],
    },
    {
      heading: 'Sécurité des données',
      body: [
        'WorkTogo met en œuvre des mesures techniques et organisationnelles raisonnables (chiffrement des mots de passe, contrôle d\'accès) pour protéger vos données contre la perte, l\'accès non autorisé ou la divulgation.',
      ],
    },
    {
      heading: 'Vos droits',
      body: ['Conformément à la réglementation applicable en matière de protection des données personnelles, vous disposez des droits suivants sur vos données :'],
      list: [
        'Droit d\'accès : obtenir la confirmation que vos données sont traitées et en obtenir une copie ;',
        'Droit de rectification : corriger des données inexactes ou incomplètes ;',
        'Droit d\'effacement : demander la suppression de vos données, sous réserve des obligations légales de conservation ;',
        'Droit d\'opposition : vous opposer, pour un motif légitime, à un traitement de vos données ;',
        'Droit à la portabilité : recevoir les données que vous avez fournies dans un format structuré et couramment utilisé.',
      ],
    },
    {
      heading: 'Exercer vos droits',
      body: [
        `Pour exercer l'un de ces droits, contactez-nous à ${SUPPORT_EMAIL} ou au ${SUPPORT_PHONE} en précisant votre demande. Une réponse vous sera apportée dans les meilleurs délais.`,
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
