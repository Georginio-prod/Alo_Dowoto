import { SUPPORT_EMAIL } from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

export const COOKIES: LegalPage = {
  slug: 'cookies',
  title: 'Gestion des cookies',
  intro: 'Cette page explique ce qu\'est un cookie, quels cookies WorkTogo utilise et comment vous pouvez les gérer.',
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: 'Qu\'est-ce qu\'un cookie ?',
      body: [
        'Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d\'un site web, qui permet de reconnaître votre navigateur lors de vos visites suivantes ou de conserver certaines informations d\'une page à l\'autre.',
      ],
    },
    {
      heading: 'Cookies utilisés par WorkTogo',
      body: ['WorkTogo utilise uniquement des cookies strictement nécessaires au fonctionnement du service :'],
      list: [
        'Cookie de session (wt_session) : permet de vous maintenir connecté à votre compte pendant votre navigation. Il est supprimé à la déconnexion ou à l\'expiration de la session.',
        'Cookie de préférence d\'interface : mémorise certains choix d\'affichage (par exemple un filtre ou une préférence de tri) pour améliorer votre confort d\'utilisation.',
      ],
    },
    {
      heading: 'Cookies tiers',
      body: [
        'WorkTogo n\'utilise à ce jour aucun cookie publicitaire ni aucun cookie de mesure d\'audience tiers (type Google Analytics ou équivalent). Si cela devait évoluer, cette page serait mise à jour et votre consentement recueilli lorsque requis.',
        'La géolocalisation (recherche de prestataires à proximité) et l\'assistant conversationnel ne reposent sur aucun cookie : ce sont des fonctionnalités distinctes, activées uniquement par une action explicite de votre part, décrites dans notre Politique de confidentialité.',
      ],
    },
    {
      heading: 'Consentement',
      body: [
        'Les cookies utilisés par WorkTogo étant strictement nécessaires au fonctionnement du service (authentification, sécurité), ils ne sont pas soumis à un recueil de consentement préalable, conformément aux pratiques en vigueur pour ce type de cookies.',
      ],
    },
    {
      heading: 'Comment gérer les cookies',
      body: [
        'Vous pouvez à tout moment configurer votre navigateur pour bloquer ou supprimer les cookies. Le blocage du cookie de session vous empêchera toutefois de rester connecté à votre compte WorkTogo.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        `Pour toute question relative aux cookies utilisés par WorkTogo : ${SUPPORT_EMAIL}.`,
      ],
    },
  ],
}
