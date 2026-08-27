# ADR 0003 — Stratégie de lancement freemium (résoudre le cold start)

**Statut :** Proposition — à valider par l'équipe produit avant lancement commercial (2026-07-21)
**Contexte :** issue #278 (« Stratégie de lancement freemium pour résoudre le cold start »)

## Contexte

Un marketplace bifaces (chercheurs ↔ prestataires) souffre d'un problème de
démarrage classique : au lancement, peu de chercheurs inscrits signifie peu
de demandes, donc peu de raisons pour un prestataire de payer un abonnement —
qui se désabonne, réduisant encore l'offre visible pour les chercheurs
suivants. Sans intervention, ce cercle empêche d'atteindre la masse critique
nécessaire pour que la plateforme s'auto-entretienne.

**État actuel du produit** (vérifié dans le code) :

- Côté chercheur : déjà gratuit avec quota (`CLIENT_CONTACTS_MONTHLY_LIMIT = 3`
  contacts/mois, `server/utils/quotaStore.ts`) — pas de paywall d'entrée.
- Côté prestataire : payant dès la première mission. Sans abonnement actif,
  `PROVIDER_REQUESTS_MONTHLY_LIMIT` vaut `0` (`getProviderRequestsUsage`,
  `quotaStore.ts`) — un prestataire non abonné ne reçoit tout simplement
  aucune demande, quel que soit le volume de chercheurs sur la zone.
- Le tableau comparatif des formules (`app/data/plans.ts`,
  `PLAN_COMPARISON`) affiche déjà un « Essai gratuit à la première
  souscription : 14 jours » pour les trois formules — **mais cette promesse
  n'est adossée à aucune logique côté serveur** :
  `server/utils/subscriptionStore.ts` (`createPendingSubscription`,
  `activateSubscription`) n'a pas de notion de période d'essai, seulement
  `en_attente` → `actif` → `expire`. C'est une incohérence produit
  préexistante, indépendante de cette issue, mais un signal utile : l'idée
  d'un accès gratuit initial était déjà anticipée côté marketing sans être
  câblée. Elle constitue une base naturelle à formaliser plutôt qu'un
  nouveau concept à inventer.

Concrètement, aujourd'hui, un prestataire qui s'inscrit sur une zone encore
peu peuplée en chercheurs doit payer un abonnement sans aucune garantie de
recevoir une seule demande avant la fin de sa période payée — le pire
scénario pour l'adoption initiale.

## Décision proposée

**Rendre la réception de demandes gratuite pour les prestataires pendant la
phase de lancement d'une zone géographique donnée, jusqu'à ce qu'un seuil de
chercheurs actifs soit atteint sur cette zone — puis basculer sur le modèle
payant actuel.**

Le levier technique le plus simple est d'étendre `PROVIDER_REQUESTS_MONTHLY_LIMIT`
avec un cas « lancement » (quota non nul sans abonnement actif), piloté par
zone/ville plutôt qu'un changement de prix des formules existantes.

## Plan proposé, par phase

1. **Phase de lancement (par zone)** — un prestataire sans abonnement actif
   reçoit un quota gratuit de démarrage (proposition : équivalent à la
   formule Mensuel, 5 demandes/mois) tant que la zone géographique où il
   opère est en dessous du seuil de densité chercheurs défini pour cette
   zone (voir issue #293, « Stratégie de lancement géographique ciblé » —
   les deux décisions doivent être cohérentes : on choisit d'abord la ou les
   zones de lancement, le freemium s'applique dedans).
2. **Seuil de bascule** — une fois la zone au-dessus du seuil (proposition à
   valider avec l'équipe croissance : ex. 50 chercheurs actifs/mois sur la
   zone, chiffre à ajuster selon les données réelles une fois le lancement
   commencé), les nouveaux prestataires de cette zone repassent sur le
   modèle payant standard (3 formules actuelles). Les prestataires déjà
   inscrits pendant la phase de lancement conservent leur accès gratuit
   jusqu'à une date de bascule annoncée à l'avance (pas de coupure
   surprise), pour ne pas punir les premiers arrivants.
3. **Formaliser la promesse déjà affichée** — indépendamment du freemium par
   zone, la période d'essai de 14 jours déjà annoncée dans
   `PLAN_COMPARISON` devrait être soit implémentée (ajouter un statut ou une
   date de fin d'essai dans `subscriptionStore.ts`), soit retirée de
   l'affichage si elle n'est pas retenue — une promesse non tenue en
   production est un risque de confiance plus grand que son absence. Ce
   point est un correctif ponctuant cette stratégie mais peut être traité
   dans une PR de code séparée, dédiée, une fois la décision de phasage
   validée ici.

## Métriques de suivi

- Nombre de chercheurs actifs par zone (déjà nécessaire pour le seuil de
  bascule).
- Taux de conversion des prestataires en accès gratuit vers un abonnement
  payant après bascule.
- Taux de demandes reçues par prestataire pendant la phase gratuite (signal
  que le quota gratuit suffit ou non à démontrer la valeur de la
  plateforme).

## Alternative rejetée

Abonnement payant dès le premier jour partout, sans distinction de zone.
Rejeté : c'est le statu quo actuel, précisément identifié comme le risque de
mortalité précoce dans l'issue — aucune raison de le reconduire sans
changement pour un lancement.

Gratuité totale et permanente pour tous les prestataires (pas de bascule).
Rejeté : supprime le modèle économique (voir aussi issue #279, « Étudier un
modèle hybride abonnement + commission ») sans date de fin ; le freemium
doit rester une mesure de lancement bornée dans le temps et l'espace, pas
une refonte tarifaire permanente.
