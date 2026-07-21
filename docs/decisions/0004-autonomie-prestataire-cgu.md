# ADR 0004 — Autonomie réelle du prestataire (revue CGU)

**Statut :** Adopté, sous réserve de revue juridique formelle par un conseil togolais (2026-07-21)
**Contexte :** issue #282 (« Revoir les CGU pour garantir l'autonomie réelle du prestataire »)

## Contexte

Une plateforme qui contrôlerait trop fortement le prix, l'attribution des
missions et les modalités d'exécution d'un prestataire indépendant s'expose
à un risque de requalification de la relation en salariat déguisé (droit du
travail togolais, par analogie avec la jurisprudence sur les plateformes de
mise en relation ailleurs). Ce document vérifie, sur preuve dans le code
actuel, si l'autonomie du prestataire WorkTogo est réelle ou seulement
apparente, puis formalise le résultat dans les CGU.

## Vérification effectuée (sur le code, pas sur l'intention)

| Critère d'autonomie | Constat dans le code actuel |
|---|---|
| **Fixation du prix** | `resolveProviderRate()` (`server/utils/providerDirectory.ts`) lit le tarif déclaré par le prestataire lui-même (`profile.rateFrom`), pas un prix imposé par un algorithme WorkTogo. Le prestataire fixe son propre prix. |
| **Liberté de refuser une mission** | `server/api/conversations/[id]/cancel.post.ts` permet au prestataire d'annuler toute commande tant qu'elle n'est pas `delivered`, avec remboursement intégral automatique du chercheur (`cancelEscrowOrder`, `server/utils/escrowOrderStore.ts`) — aucune pénalité pour le prestataire au-delà de la fourniture d'un motif obligatoire (traçabilité/modération, pas une sanction). |
| **Disponibilités** | Le profil prestataire porte un champ `availability` libre (`getProviderProfile`, texte déclaratif, ex. « Disponible sous 48h »), déclaré et modifiable par le prestataire lui-même. |
| **Méthode d'exécution** | Rien dans le code ne prescrit d'horaires, de procédure d'intervention ou d'exclusivité — WorkTogo n'intervient ni dans la négociation ni dans l'exécution de la prestation (déjà affirmé à l'article 4 des CGU, « Rôle de WorkTogo »). |

**Point de vigilance identifié, non traité par cette ADR** : l'attribution
initiale d'une mission se fait aujourd'hui par assignation automatique (le
chercheur paie directement le tarif du prestataire choisi dans les résultats
de recherche, sans étape de mise en relation où le prestataire accepterait
explicitement *avant* que l'argent soit débité). Le prestataire n'apprend la
commande qu'après le paiement, via le message `order_confirmation`
(`server/api/conversations/[id]/pay.post.ts`). Ce document considère que le
droit d'annulation sans pénalité, disponible à tout moment avant livraison,
équivaut fonctionnellement à un droit de refus a posteriori suffisant pour
préserver l'autonomie — mais une revue juridique formelle devrait confirmer
que cette équivalence tient en droit togolais, pas seulement en pratique.

## Décision

Formaliser dans les CGU (article 6, « Utilisation du service par les
prestataires ») une clause explicite affirmant cette autonomie : fixation
du tarif, liberté de refuser/annuler avant exécution sans pénalité, absence
d'horaires ou d'exclusivité imposés.

## Limite assumée

Ce document est une revue technique (vérification par lecture de code), pas
la revue juridique formelle exigée par le critère d'acceptation de l'issue
(« revue juridique des CGU confirmant une autonomie suffisante »). Il fournit
la matière factuelle nécessaire à cette revue — notamment le point de
vigilance sur l'assignation automatique avant confirmation explicite — mais
ne la remplace pas. Un conseil juridique togolais devrait valider
formellement, en particulier, si le mécanisme d'annulation sans pénalité
suffit à écarter le risque de requalification malgré l'assignation
automatique initiale.
