# ADR 0007 — Étude comparative : abonnement seul vs modèle hybride abonnement + commission

**Statut :** Étude livrée pour validation par l'équipe ; **décision finale de tarification en attente**
**Contexte :** issue #279 (« Étudier un modèle hybride abonnement + commission »)

## Constat de départ à corriger

L'issue part du principe que WorkTogo fonctionne aujourd'hui sur un
« abonnement fixe » pur. **Ce n'est déjà plus le cas dans le code actuel** :
une commission de 10 % (`ESCROW_COMMISSION_RATE`,
`server/utils/escrowOrderStore.ts`) est prélevée sur chaque prestation
réglée en séquestre, au moment de la libération des fonds vers le
prestataire (`confirmEscrowOrderReceipt`/validation tacite). WorkTogo
applique donc **déjà un modèle hybride de fait** : abonnement (accès,
visibilité, quota de demandes) + commission par transaction réalisée via la
plateforme. Cette étude porte donc sur une question plus précise que celle
initialement posée : *le dosage actuel entre abonnement et commission
est-il le bon, ou faut-il rééquilibrer les deux curseurs ?*

## Les deux modèles comparés

- **Modèle A — Abonnement seul (hypothétique)** : prix d'abonnement actuel
  (`app/data/plans.ts`), aucune commission. Le prestataire garde 100 % du
  prix convenu.
- **Modèle B — Hybride (déjà en production)** : mêmes prix d'abonnement +
  10 % de commission prélevée à chaque prestation réglée via WorkTogo. Le
  prestataire garde 90 % du prix convenu, WorkTogo perçoit l'abonnement et
  la commission.

## Étude comparative chiffrée

Trois profils de prestataires (par volume mensuel de prestations réalisées
**via la plateforme**), formule mensuelle (5 000 FCFA/mois, quota 5
demandes) :

| Profil | Missions/mois | Ticket moyen | CA prestataire/mois |
| --- | --- | --- | --- |
| Peu actif | 2 | 3 000 FCFA | 6 000 FCFA |
| Actif | 5 | 4 000 FCFA | 20 000 FCFA |
| Très actif | 15 | 5 000 FCFA | 75 000 FCFA |

*(le profil « Très actif » suppose une formule trimestrielle/annuelle pour
lever le quota de 5 demandes/mois — voir `PROVIDER_REQUESTS_MONTHLY_LIMIT`,
`server/utils/quotaStore.ts` — les montants d'abonnement ci-dessous sont
ramenés à un équivalent mensuel pour rester comparables.)*

| Profil | Revenu WorkTogo — Modèle A (abonnement seul) | Revenu WorkTogo — Modèle B (hybride, actuel) | Net perçu par le prestataire — A | Net perçu par le prestataire — B |
| --- | --- | --- | --- | --- |
| Peu actif | 5 000 FCFA | 5 000 + 600 = 5 600 FCFA | 6 000 FCFA | 5 400 FCFA |
| Actif | 5 000 FCFA | 5 000 + 2 000 = 7 000 FCFA | 20 000 FCFA | 18 000 FCFA |
| Très actif | ~4 000 FCFA (annuel) | ~4 000 + 7 500 = 11 500 FCFA | 75 000 FCFA | 67 500 FCFA |

## Lecture des résultats

1. **Sous le modèle A (abonnement seul)**, le revenu de WorkTogo est
   totalement déconnecté du volume réellement traité : un prestataire « très
   actif » ne rapporte pas plus qu'un prestataire « peu actif » ayant payé la
   même formule — c'est exactement le problème documenté par l'issue
   (« l'abonnement fixe ne capte pas la valeur des prestataires très
   actifs »). Pire : une fois l'abonnement payé, ce prestataire n'a plus
   aucune incitation financière à faire transiter ses missions
   supplémentaires par la plateforme plutôt qu'en direct — la commission
   étant nulle, contourner ne lui coûte rien de plus que de rester.
2. **Sous le modèle B (hybride, déjà actif)**, le revenu de WorkTogo croît
   avec le volume réellement traité par la plateforme — un prestataire très
   actif rapporte environ 3× plus qu'un prestataire peu actif, proportionnel
   à l'usage réel. Le prestataire perd 10 % par transaction WorkTogo, ce qui
   est *justement* le mécanisme qui rend le contournement financièrement
   comparable plutôt que strictement plus avantageux pour lui — cohérent
   avec l'article 8 des CGU (paiement intégral obligatoire via la
   plateforme) et la procédure de sanction du contournement (voir ADR sur le
   signalement du contournement, `docs/decisions/`).
3. **Ce que cette étude ne tranche pas** : le *taux exact* de commission
   (10 % aujourd'hui) et le *niveau des paliers d'abonnement* restent des
   paramètres de tarification, pas une question de modèle. Un taux plus bas
   avec un abonnement légèrement réduit pourrait mieux retenir les
   prestataires très actifs (qui sont aussi les plus exposés au risque de
   contournement) ; un taux plus élevé capterait davantage de valeur mais
   augmenterait la tentation de contournement chez les gros volumes. C'est
   un arbitrage produit qui dépasse le périmètre technique de ce document.

## Recommandation

- **Conserver le modèle hybride** (déjà en production, pas de changement de
  mécanisme nécessaire) — l'analyse ci-dessus confirme qu'il aligne mieux
  les intérêts de WorkTogo et des prestataires très actifs que
  l'abonnement seul, contrairement à la prémisse de l'issue.
- **Proposer à l'équipe une revue du dosage** abonnement/commission (ex.
  simuler un taux de commission à 7 % ou 8 % avec abonnement inchangé, ou un
  abonnement réduit de 10-15 % sur la formule annuelle compensé par la
  commission déjà perçue) — décision finale de tarification hors périmètre
  de ce document, à trancher par l'équipe produit avec des données réelles
  d'usage une fois suffisamment de volume traité en production.

## Critères d'acceptation de l'issue — état

- [x] Étude comparative chiffrée des deux modèles présentée à l'équipe
      avant décision finale — livrée ci-dessus. La décision finale de
      dosage (taux de commission, paliers d'abonnement) reste à trancher par
      l'équipe produit.
