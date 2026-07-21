# ADR 0005 — Stratégie de lancement géographique ciblé

**Statut :** Proposition — à valider par l'équipe produit/croissance avant lancement commercial (2026-07-21)
**Contexte :** issue #293 (« Stratégie de lancement géographique ciblé »)

## Contexte

Un marketplace bifaces perd en qualité perçue s'il se lance partout à la
fois avec une offre encore clairsemée : un chercheur qui recherche un
prestataire dans sa ville et ne trouve personne (ou une seule fiche) vit une
mauvaise première expérience, difficile à rattraper. Concentrer l'offre sur
une zone jusqu'à une densité minimale, puis étendre progressivement, réduit
ce risque — c'est le sujet de cette ADR, à mettre en cohérence avec la
stratégie freemium (`docs/decisions/0003-strategie-lancement-freemium.md`,
issue #278) : les deux décisions doivent se prendre ensemble, la seconde
s'appliquant *dans* la ou les zones choisies ici.

**État actuel du produit** (vérifié dans le code) : aucune notion de
« zone de lancement » n'existe. L'annuaire de démonstration
(`server/utils/providerDirectory.ts`, `DIRECTORY`) couvre déjà six villes
togolaises (Lomé, Kara, Sokodé, Kpalimé, Atakpamé, Dapaong), sans
hiérarchie ni priorité affichée. Signal indirect : 7 des 14 fiches de démo
sont à Lomé, contre 1 à 2 par ville pour les cinq autres — une inclination
de fait vers Lomé dans les données de démonstration, jamais formalisée
comme un choix de lancement.

## Décision proposée

**Lancer d'abord sur une seule ville — Lomé, la plus peuplée et déjà la
mieux représentée dans les données existantes — avant toute extension.**
Ne communiquer/promouvoir activement que sur cette zone tant qu'un seuil de
densité prestataires n'est pas atteint, même si l'inscription reste
techniquement ouverte partout (pas de blocage dur, juste un choix de mise
en avant marketing et d'effort commercial).

## Seuil de densité proposé avant extension

Proposition à valider avec l'équipe croissance, faute de données réelles
d'usage à ce stade : **au moins 5 prestataires actifs par sous-secteur
prioritaire** (ménage, plomberie/BTP, beauté — les catégories les plus
demandées dans ce type de marketplace de services à la personne) **sur la
zone de lancement**, avec un taux de réponse aux demandes (confirmation de
prise en charge, voir #289) supérieur à 80 % sur les 30 derniers jours.
Ce dernier critère évite d'étendre la couverture géographique tant que la
qualité de service dans la zone actuelle n'est pas fiable.

## Plan en phases

1. **Phase 1 — Lomé uniquement.** Effort commercial et marketing concentré
   sur Lomé. Les autres villes restent accessibles (pas de restriction
   technique — supprimer l'accès serait plus coûteux à développer que
   simplement ne pas y investir de budget d'acquisition) mais ne reçoivent
   aucune promotion active.
2. **Seuil atteint → Phase 2, une ville secondaire.** Choisir la ville
   secondaire selon la demande organique observée en Phase 1 (villes d'où
   proviennent des recherches/inscriptions chercheur sans offre suffisante
   en face), plutôt que fixer cette ville à l'avance sans donnée réelle.
3. **Répéter par ville**, jamais plusieurs zones ouvertes simultanément tant
   que la précédente n'a pas atteint son seuil.

## Cohérence avec le freemium (#278)

Le freemium par zone (ADR 0003) doit s'activer sur la zone de lancement
courante (Phase 1 = Lomé) dès le départ, pour attirer les premiers
prestataires sans le frein de l'abonnement — la bascule vers le modèle
payant, dans cette zone, suit le seuil de densité chercheurs défini dans
l'ADR 0003, indépendant du seuil de densité *prestataires* défini ici (les
deux se complètent : l'un mesure l'offre, l'autre la demande).

## Métriques de suivi

- Nombre de prestataires actifs par ville et sous-secteur.
- Taux de confirmation de prise en charge sous 30 minutes (donnée déjà
  disponible via le mécanisme de réattribution automatique, #289 —
  `server/utils/escrowOrderStore.ts`, `PROVIDER_RESPONSE_TIMEOUT_MS`).
- Recherches sans résultat par ville (signal de demande non couverte,
  utile pour choisir la ville secondaire).

## Alternative rejetée

Lancement simultané sur toutes les villes déjà représentées dans l'annuaire
de démonstration. Rejeté : dilue l'effort commercial sur six zones à la
fois sans qu'aucune n'atteigne une densité utile rapidement — precisément
le risque que cette issue demande d'éviter.
