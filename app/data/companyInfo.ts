/**
 * Coordonnées affichées dans le footer, la page contact et les pages
 * légales (#132). Aucune coordonnée officielle n'existe encore pour ce
 * prototype : valeurs de démonstration (même domaine que les fiches
 * prestataires de démo, server/utils/providerDirectory.ts) à remplacer par
 * les informations réelles de la société avant mise en production.
 *
 * Les champs marqués « [à compléter] » correspondent à des informations
 * obligatoires dans des mentions légales conformes (identité de
 * l'éditeur, hébergeur — art. 6-III de la LCEN et équivalents togolais)
 * mais que WorkTogo n'a pas encore, faute de société immatriculée : plutôt
 * que d'inventer un numéro RCCM ou une adresse qui semblerait réelle, le
 * texte les signale explicitement comme en attente.
 */
export const COMPANY_NAME = 'WorkTogo'
export const SUPPORT_EMAIL = 'support@worktogo-demo.tg'
export const SUPPORT_PHONE = '+228 90 00 00 00'

/** Forme juridique envisagée — à confirmer à l'immatriculation (SARL, SARLU, SA… selon l'Acte uniforme OHADA relatif au droit des sociétés commerciales). */
export const LEGAL_FORM = '[à compléter]'
/** Numéro RCCM (Registre du Commerce et du Crédit Mobilier), délivré à l'immatriculation OHADA. */
export const REGISTRATION_NUMBER = '[à compléter]'
/** Numéro d'Identifiant Fiscal Unique (NIF), délivré par l'Office Togolais des Recettes. */
export const TAX_ID = '[à compléter]'
/** Adresse du siège social. */
export const REGISTERED_ADDRESS = '[à compléter]'
/** Nom, raison sociale et coordonnées de l'hébergeur du service. */
export const HOSTING_PROVIDER = '[à compléter]'
/** Personne physique ou morale responsable de la publication du contenu du site. */
export const PUBLICATION_DIRECTOR = '[à compléter]'
