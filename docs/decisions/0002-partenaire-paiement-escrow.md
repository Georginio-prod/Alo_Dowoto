# ADR 0002 — Choix d'un partenaire de paiement agréé pour le séquestre

**Statut :** Proposition — à valider par l'équipe juridique/produit (2026-07-21)
**Contexte :** issue #272 (« Choisir un partenaire de paiement agréé pour le séquestre »)

## Contexte

WorkTogo encaisse l'argent du chercheur (mise en séquestre) avant de le
reverser au prestataire à la validation de la prestation. Faire transiter des
fonds de tiers de cette façon relève des services de paiement / de la monnaie
électronique, une activité réglementée dans l'espace UEMOA sous la
supervision de la BCEAO : elle nécessite soit un agrément propre
(établissement de monnaie électronique), soit un partenariat avec un
établissement déjà agréé qui porte la conformité réglementaire.

**État actuel du code** (vérifié, `server/api/payments/initiate.post.ts` et
`.env.example`) : l'intégration Flooz/T-Money existante est **entièrement
simulée** — le commentaire du code l'indique explicitement (« simule
actuellement la confirmation opérateur, faute d'accès sandbox »), et
`FLOOZ_API_KEY`/`TMONEY_API_KEY` ne sont pas encore lus. Le portefeuille
interne (`walletStore.ts`) et le séquestre (`escrowOrderStore.ts`) sont eux
aussi en mémoire, non persistés (voir `docs/audit-2026-07-20.md`, point 10).
**Aucun circuit de paiement réel et conforme n'existe aujourd'hui** : ce
n'est pas un choix technique secondaire, c'est un prérequis bloquant avant
toute mise en production avec de l'argent réel.

## Décision à prendre

Ce document ne tranche pas seul le choix final — il structure la décision et
recommande une direction, à valider par une revue juridique écrite (critère
d'acceptation de l'issue #272) avant intégration.

## Options considérées

Agrégateurs de paiement actifs en Afrique de l'Ouest / au Togo, capables de
gérer collecte + reversement (split payment ou équivalent) et Mobile Money
local (Flooz, T-Money) :

| Critère | CinetPay | Kkiapay | Semoa / PayGate |
|---|---|---|---|
| Présence Togo (Flooz/T-Money) | Oui | Oui | Oui (Semoa est togolais) |
| Couverture UEMOA élargie | Oui (plusieurs pays) | Oui (Bénin, élargi) | Togo d'abord, extension variable |
| Mécanisme de split/réversement vers un tiers | À confirmer selon offre souscrite | À confirmer selon offre souscrite | À confirmer selon offre souscrite |
| Statut réglementaire | Partenaire d'établissements agréés | Partenaire d'établissements agréés | Acteur local, à vérifier l'agrément propre |
| Intégration développeur | API + sandbox documentées | API + sandbox documentées | À vérifier (documentation moins publique) |

**Frais, plafonds et clauses contractuelles ne sont volontairement pas
chiffrés dans ce document** : ces conditions sont commerciales, changent
fréquemment, et ne peuvent être vérifiées de façon fiable sans échange direct
avec chaque fournisseur. Toute décision finale doit se baser sur les grilles
tarifaires et contrats obtenus directement auprès des candidats retenus, pas
sur ce tableau.

## Recommandation

1. **Écarter la piste d'un compte "maison" non agréé** : quel que soit le
   fournisseur retenu, WorkTogo ne doit jamais détenir directement les fonds
   des chercheurs sans passer par un établissement agréé ou un partenaire qui
   porte cette conformité — c'est le risque juridique majeur identifié par
   l'issue.
2. **Prioriser CinetPay ou Kkiapay** pour une première intégration : les deux
   couvrent Flooz/T-Money, disposent d'API et de sandbox documentées
   publiquement (contrairement à Semoa/PayGate, moins documentés
   publiquement au moment de la rédaction), et sont déjà utilisés par
   d'autres plateformes ouest-africaines pour des cas d'usage de mise en
   relation similaires. Semoa reste une option locale à ne pas exclure si
   les deux premiers ne couvrent pas un besoin spécifique (ex. conditions
   commerciales, support local).
3. **Vérifier explicitement, avant tout engagement contractuel**, que
   l'offre retenue permet bien un mécanisme de séquestre/split payment
   (fonds bloqués jusqu'à un événement de libération déclenché par
   WorkTogo), pas seulement un encaissement simple — certaines offres
   d'agrégateurs ne proposent que l'encaissement direct vers le marchand,
   ce qui ne suffit pas au modèle escrow de WorkTogo.

## Prochaines étapes (hors périmètre de ce document)

- Obtenir une validation juridique écrite du circuit retenu (critère
  d'acceptation de l'issue #272) — nécessite un conseil juridique togolais/
  UEMOA, non réalisable depuis ce dépôt de code.
- Une fois un fournisseur présélectionné, intégrer et tester en sandbox
  (`server/api/payments/initiate.post.ts`, `server/api/wallet/webhook.post.ts`)
  avant de remplacer la simulation actuelle.
- Traiter en parallèle le chantier de persistance (`docs/audit-2026-07-20.md`,
  point 10) : brancher `escrowOrderStore.ts`/`walletStore.ts` sur Prisma
  reste un prérequis indépendant mais tout aussi bloquant avant une mise en
  production avec de l'argent réel.

## Alternative rejetée

Solliciter un agrément de monnaie électronique propre à WorkTogo. Rejeté à ce
stade : démarche longue et coûteuse, disproportionnée pour une plateforme en
phase de lancement — un partenariat avec un établissement déjà agréé est la
voie standard pour ce type de marketplace tant que le volume ne justifie pas
un agrément propre.
