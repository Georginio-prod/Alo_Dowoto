/**
 * Contenu FAQ officiel (FR) utilisé par l'outil `consulterFAQ` de l'assistant
 * IA (#geoloc, 2.2). Porté depuis `app/data/faq.ts` + `i18n/locales/fr.json`
 * (ADR-0016) : le backend est standalone (n'importe pas le code de l'app),
 * donc les libellés FR sont **copiés** ici — à garder synchronisé avec
 * `i18n/locales/fr.json` (clés `faq.*`). L'assistant répond toujours en
 * français par conception, d'où une seule locale.
 */
export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCategory {
  id: string
  title: string
  items: FaqItem[]
}

const FAQ_CATEGORIES_FR: FaqCategory[] = [
  {
    "id": "chercheurs",
    "title": "Chercheurs",
    "items": [
      {
        "question": "Comment trouver un prestataire ?",
        "answer": "Recherchez un secteur depuis la page d'accueil ou le menu « Trouver un prestataire », ou tapez directement ce que vous cherchez dans la barre de recherche. Comparez ensuite les profils vérifiés, les avis et les tarifs indicatifs près de chez vous."
      },
      {
        "question": "Comment contacter un prestataire ?",
        "answer": "Depuis sa fiche profil ou une carte de résultat, cliquez sur « Contacter » : une conversation s'ouvre directement avec lui dans votre messagerie."
      },
      {
        "question": "Le contact avec un prestataire est-il gratuit ?",
        "answer": "Oui. Chaque compte chercheur dispose d'un quota de contacts gratuits par mois, visible sur votre tableau de bord. Le compteur se réinitialise automatiquement au mois suivant."
      },
      {
        "question": "Comment publier une demande précise plutôt que de chercher moi-même ?",
        "answer": "Depuis « Publier une demande », décrivez votre besoin (titre, compétences recherchées, budget, urgence, localisation) : WorkTogo vous propose alors les profils les mieux adaptés, classés par pertinence."
      },
      {
        "question": "À quoi servent les favoris ?",
        "answer": "Le bouton étoile sur une fiche prestataire l'ajoute à vos favoris, accessibles depuis « Mon espace ». Pratique pour recontacter plus tard un prestataire que vous avez repéré."
      },
      {
        "question": "Comment fonctionne la notation ?",
        "answer": "Une fois la collaboration terminée, chercheur et prestataire peuvent se noter mutuellement (1 à 5 étoiles, avec un commentaire facultatif) depuis le fil de messagerie. Chaque partie ne peut noter qu'une seule fois la même collaboration."
      }
    ]
  },
  {
    "id": "prestataires",
    "title": "Prestataires",
    "items": [
      {
        "question": "Comment devenir prestataire sur WorkTogo ?",
        "answer": "Cliquez sur « Devenir prestataire », créez votre compte (numéro vérifié par code), choisissez votre secteur d'activité, puis votre formule d'abonnement et votre mode de paiement."
      },
      {
        "question": "Combien de demandes puis-je recevoir par mois ?",
        "answer": "Cela dépend de votre formule : 5 demandes par mois en Mensuel, 20 en Trimestriel, et un nombre illimité en Annuel. Le détail complet est sur la page Tarification."
      },
      {
        "question": "Comment obtenir le badge « Vérifié » ?",
        "answer": "En vérifiant votre identité (carte d'identité + photo passeport) depuis « Modifier mon profil ». C'est indépendant de votre formule d'abonnement, mais obligatoire pour pouvoir être contacté par un client."
      },
      {
        "question": "Comment fonctionne le paiement de mon abonnement ?",
        "answer": "Le paiement s'effectue par Mobile Money (Flooz ou T-Money). Un essai gratuit de 14 jours est offert à la première souscription, sans engagement au-delà de la première période."
      },
      {
        "question": "Puis-je changer de formule en cours de route ?",
        "answer": "Oui, vous pouvez passer à une formule supérieure depuis la page Tarification à tout moment."
      }
    ]
  },
  {
    "id": "compte",
    "title": "Compte et sécurité",
    "items": [
      {
        "question": "Comment modifier mon profil (nom, localisation…) ?",
        "answer": "Depuis le menu du compte (en haut à droite), cliquez sur « Modifier mon profil »."
      },
      {
        "question": "Comment changer mon mot de passe ?",
        "answer": "Depuis le menu du compte, cliquez sur « Changer le mot de passe ». Votre mot de passe actuel vous sera demandé par sécurité."
      },
      {
        "question": "J'ai oublié mon mot de passe, que faire ?",
        "answer": "La réinitialisation automatique du mot de passe arrive bientôt. En attendant, contactez le support : nous vous aiderons à retrouver l'accès à votre compte."
      },
      {
        "question": "Puis-je avoir un compte chercheur et un compte prestataire ?",
        "answer": "Un compte est associé à un seul rôle, définitif. Depuis le menu du compte, « Changer de compte » vous oriente soit vers la connexion à un compte existant de l'autre rôle (si vous en avez déjà un, avec un autre numéro ou email), soit vers la création d'un nouveau compte."
      },
      {
        "question": "Pourquoi dois-je vérifier mon identité ?",
        "answer": "La vérification (carte d'identité + photo passeport fond blanc) est facultative à l'inscription, mais obligatoire ensuite : pour un chercheur, avant de publier sa première demande ; pour un prestataire, avant de pouvoir être contacté par un client. Elle certifie votre compte (badge « Vérifié ») et renforce la confiance entre utilisateurs. Complétez-la à tout moment depuis « Modifier mon profil »."
      },
      {
        "question": "Comment supprimer mon compte ?",
        "answer": "La suppression en libre-service n'est pas encore disponible. Contactez le support avec votre demande : nous procéderons à la suppression de votre compte et de vos données, sous réserve des durées de conservation légalement requises."
      }
    ]
  },
  {
    "id": "confidentialite",
    "title": "Confidentialité et sécurité des échanges",
    "items": [
      {
        "question": "Mes données sont-elles partagées avec des tiers ?",
        "answer": "Non. Vos coordonnées ne sont partagées qu'avec la personne que vous contactez vous-même via la messagerie. Le détail complet figure dans la Politique de confidentialité."
      },
      {
        "question": "Comment WorkTogo vérifie-t-il les comptes ?",
        "answer": "Le badge « Vérifié » repose sur la carte d'identité et la photo passeport télé-versées par l'utilisateur, chercheur ou prestataire. Il confirme la cohérence des éléments déclarés, sans remplacer votre propre vigilance : comparez les avis, échangez avant de vous engager, et signalez tout comportement suspect."
      },
      {
        "question": "Comment signaler un problème avec un chercheur ou un prestataire ?",
        "answer": "Utilisez la page « Déposer une réclamation », accessible depuis le centre d'aide. Décrivez la situation : notre équipe reviendra vers vous."
      }
    ]
  }
]

/** FAQ officielle en français, pour l'assistant IA (iso `app/data/faq.getFaqCategoriesFr`). */
export function getFaqCategoriesFr(): FaqCategory[] {
  return FAQ_CATEGORIES_FR
}

