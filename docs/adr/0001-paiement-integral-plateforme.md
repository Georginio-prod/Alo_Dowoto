# ADR 0001 — Paiement intégral via la plateforme (pas d'acompte/solde hors app)

**Statut :** Adopté — 2026-07-21
**Contexte :** issue #276 (« Empêcher le règlement partiel en espèces sur place »)

## Contexte

Un modèle où seule une partie du prix (« avance ») transiterait par WorkTogo et
le solde serait réglé en espèces sur place ouvrirait une porte directe à la
négociation hors plateforme dès la deuxième prestation : le chercheur et le
prestataire, ayant déjà échangé pour le règlement du solde, n'ont ensuite
aucune raison de repasser par l'app pour la fois suivante. Cela réduit la
commission perçue par WorkTogo et affaiblit les garanties associées au
séquestre (le prestataire ne serait plus protégé pour la part payée en
espèces, le chercheur n'aurait plus de recours plateforme dessus).

## Décision

**100 % du montant convenu transite par le système de paiement en séquestre
de la plateforme, avant le début de l'intervention. Aucun acompte partiel
avec solde réglé en espèces n'est autorisé.**

Cette décision est documentée dans les CGU (`app/data/legalPages/cgu.ts`,
article 8 « Paiement intégral des prestations via la plateforme », et
article 10 « Comportements interdits »).

## Conséquences techniques

- Le modèle `EscrowOrder` (`server/utils/escrowOrderStore.ts`) ne porte
  qu'un seul champ `amount` : il n'existe pas, et il ne doit pas être ajouté,
  de notion d'acompte/solde partiel dans le flux de paiement.
- Le flux `awaiting_payment → in_escrow → delivered → released` garantit déjà
  structurellement qu'une commande ne peut atteindre `delivered` ou
  `released` sans être passée par `in_escrow` (paiement intégral débité via
  `payEscrowOrder`) — voir les tests de régression dans
  `tests/escrowOrderStore.test.ts` (« paiement intégral obligatoire »).
- Si un besoin métier de devis/acompte apparaît plus tard (voir le
  commentaire `resolveProviderRate` dans `escrowOrderStore.ts`, qui anticipe
  déjà un futur système de devis), toute évolution devra explicitement
  préserver cette contrainte : la totalité du montant final doit être en
  séquestre avant `delivered`.

## Alternative rejetée

Autoriser un acompte via la plateforme et le solde en espèces sur place, pour
réduire le montant immobilisé côté chercheur. Rejeté : le gain de trésorerie
ne compense pas la perte de commission et l'affaiblissement du système de
confiance (garantie de paiement, assurance, litiges) qui repose entièrement
sur le fait que l'intégralité de la transaction est tracée par WorkTogo.
