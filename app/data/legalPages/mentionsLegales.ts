import {
  COMPANY_NAME,
  HOSTING_PROVIDER,
  LEGAL_FORM,
  PUBLICATION_DIRECTOR,
  REGISTERED_ADDRESS,
  REGISTRATION_NUMBER,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  TAX_ID,
} from '../companyInfo'
import { LAST_UPDATED, type LegalPage } from './types'

export const MENTIONS_LEGALES: LegalPage = {
  slug: 'mentions-legales',
  title: 'Mentions légales',
  intro: 'Informations relatives à l\'édition, la publication et l\'hébergement de la plateforme WorkTogo, conformément aux exigences applicables aux services de communication en ligne.',
  updatedAt: LAST_UPDATED,
  sections: [
    {
      heading: 'Éditeur du site',
      body: [
        `Le site et l'application WorkTogo sont édités par ${COMPANY_NAME}.`,
      ],
      list: [
        `Forme juridique : ${LEGAL_FORM}`,
        `Siège social : ${REGISTERED_ADDRESS}`,
        `Registre du Commerce et du Crédit Mobilier (RCCM) : ${REGISTRATION_NUMBER}`,
        `Numéro d'Identifiant Fiscal Unique (NIF) : ${TAX_ID}`,
        `Email : ${SUPPORT_EMAIL}`,
        `Téléphone : ${SUPPORT_PHONE}`,
      ],
    },
    {
      heading: 'Directeur de la publication',
      body: [
        `La direction de la publication est assurée par ${PUBLICATION_DIRECTOR}.`,
      ],
    },
    {
      heading: 'Hébergement',
      body: [
        `Le site est hébergé par ${HOSTING_PROVIDER}.`,
      ],
    },
    {
      heading: 'Propriété intellectuelle',
      body: [
        'La structure du site, son design, ses textes, logos, icônes et l\'ensemble des éléments qui le composent sont la propriété de WorkTogo ou de ses partenaires, et sont protégés par le droit de la propriété intellectuelle.',
        'Toute reproduction, représentation, modification ou extraction, totale ou partielle, sans autorisation écrite préalable, est interdite. Les profils et contenus publiés par les prestataires restent leur propriété ; ils accordent à WorkTogo une licence limitée à l\'affichage sur la plateforme, dans le cadre de la mise en relation.',
      ],
    },
    {
      heading: 'Liens hypertextes',
      body: [
        'WorkTogo peut contenir des liens vers des sites tiers (réseaux sociaux, ressources d\'aide). WorkTogo n\'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou leurs pratiques.',
      ],
    },
    {
      heading: 'Données personnelles et cookies',
      body: [
        'Le traitement des données personnelles et l\'utilisation des cookies sur WorkTogo sont détaillés dans la Politique de confidentialité et la page Gestion des cookies, accessibles depuis le pied de page.',
      ],
    },
    {
      heading: 'Droit applicable et juridiction compétente',
      body: [
        'Les présentes mentions légales sont soumises au droit togolais. Tout litige relatif à leur interprétation ou leur exécution relève, à défaut de résolution amiable, de la compétence des juridictions togolaises.',
      ],
    },
    {
      heading: 'Nous contacter',
      body: [
        `Pour toute question relative aux présentes mentions légales : ${SUPPORT_EMAIL} ou ${SUPPORT_PHONE}.`,
      ],
    },
  ],
}
