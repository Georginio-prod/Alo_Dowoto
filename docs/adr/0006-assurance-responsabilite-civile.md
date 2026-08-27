# ADR 0006 — Assurance responsabilité civile pendant les interventions

**Statut :** Proposition — nécessite une action réelle de souscription avant lancement commercial (2026-07-21)
**Contexte :** issue #284 (« Assurance responsabilité civile pendant les interventions »)

## Contexte

Une intervention à domicile (ménage, plomberie, jardinage, garde d'enfants…)
comporte un risque réel de dommage matériel ou corporel. Aujourd'hui, les
CGU (`app/data/legalPages/cgu.ts`, article 4 « Rôle de WorkTogo ») dégagent
explicitement la responsabilité de WorkTogo sur la qualité et l'exécution
des prestations, mais **aucune couverture d'assurance n'existe** pour
absorber un dommage réel survenu pendant une intervention — le litige
retomberait entièrement sur une négociation directe chercheur/prestataire,
sans filet.

La CGU issue de #267 (article 9, « Garantie de paiement, assurance et mise
en avant ») mentionne déjà « toute couverture d'assurance responsabilité
civile associée à une intervention », **conditionnée** au passage par la
plateforme — mais ce texte suppose qu'une couverture existe sans préciser
qui la souscrit ni qui la finance. Cette ADR comble ce vide.

## Décision à prendre

Comme pour le choix du partenaire de paiement (ADR 0002, issue #272), ce
document structure la décision et recommande une direction — la
souscription effective d'une police d'assurance est une démarche réelle
(contact assureur, signature, primes) qui ne peut pas être « codée » ;
le critère d'acceptation de l'issue (« couverture active et documentée
avant le lancement ») dépend d'une action humaine hors de ce dépôt.

## Options considérées

| Option | Description | Avantage | Inconvénient |
|---|---|---|---|
| **A. RC pro individuelle obligatoire** | Chaque prestataire doit détenir sa propre assurance RC professionnelle, preuve à fournir lors de la vérification d'identité (`server/utils/verificationStore.ts`), avant activation du compte. | Pas de prime à la charge de WorkTogo ; standard dans plusieurs secteurs réglementés (BTP, électricité) où les prestataires en disposent parfois déjà. | Barrière à l'entrée forte pour des prestataires informels à faible trésorerie (cohérent avec le problème identifié par l'issue #281, « réduire la barrière d'entrée pour les nouveaux prestataires ») — risque de contradiction entre les deux objectifs produit. |
| **B. Police collective souscrite par WorkTogo** | WorkTogo souscrit une police-cadre couvrant toute intervention réalisée et payée via la plateforme (répercutée ou non sur l'abonnement). | Aucune barrière côté prestataire ; cohérent avec l'article 9 des CGU (garantie conditionnée au passage plateforme, pas au statut individuel du prestataire). | Coût et démarche à la charge de WorkTogo ; nécessite de trouver un assureur togolais acceptant de couvrir une population de prestataires indépendants variés (BTP, ménage, beauté…) sous un même contrat-cadre — profil de risque hétérogène à négocier. |
| **C. Hybride** | Couverture de base incluse (option B) pour les interventions à faible risque (ménage, garde d'enfants), RC pro individuelle exigée en plus pour les secteurs à risque matériel plus élevé (plomberie, électricité, BTP). | Aligne le niveau de couverture sur le risque réel par secteur. | Complexifie le parcours d'inscription et la vérification par secteur — plus de travail produit avant de pouvoir lancer. |

## Recommandation

**Option B en priorité pour le lancement (Phase 1, cohérente avec le
lancement géographique ciblé de l'ADR 0005) : police collective souscrite
par WorkTogo**, pour ne pas ajouter de barrière à l'entrée prestataire au
moment précis où l'acquisition de l'offre est critique (voir aussi ADR
0003, freemium de lancement — même logique de réduction de friction).
**Basculer vers l'option C (hybride) une fois la Phase 1 validée**, en
ajoutant une exigence de RC pro individuelle pour les sous-secteurs à
risque matériel élevé identifiés via les données réelles de sinistralité
observées (aucune donnée de ce type n'existe avant lancement — décision à
revoir avec des chiffres réels, pas dans l'abstrait).

## Prochaines étapes (hors périmètre de ce document)

1. Contacter au moins deux assureurs togolais pour un devis de police-cadre
   RC pro couvrant une activité de mise en relation de services à la
   personne — non réalisable depuis ce dépôt de code.
2. Une fois une police active, ajouter la référence contractuelle (numéro
   de police, plafond de garantie, exclusions) à la clause existante de
   l'article 9 des CGU, aujourd'hui rédigée au conditionnel (« toute
   couverture d'assurance ») faute de police réelle à référencer.
3. Documenter dans les CGU la répartition de responsabilité en cas de
   sinistre (déclenchement du sinistre, franchise éventuelle, rôle de
   l'équipe support dans le signalement — à coordonner avec le processus
   de médiation des litiges, #274).

## Alternative rejetée

Ne rien couvrir avant le lancement, en s'appuyant uniquement sur la clause
de non-garantie déjà présente à l'article 4 des CGU. Rejeté : c'est le
statu quo actuel, précisément le risque identifié par l'issue (« litiges
non résolus, responsabilité floue, image dégradée de la plateforme ») —
aucune raison de le reconduire sans changement.
