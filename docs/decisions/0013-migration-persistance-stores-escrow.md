# ADR 0013 — Migration des stores métier en mémoire vers Prisma

**Statut :** Proposé (2026-07-22)
**Contexte :** issue #342 (« Persister wallet/escrow/paiements/abonnements sur Prisma ») — point critique de l'audit tri-expertise (`docs/audit-2026-07-triple-expertise.md`, C1).

## Constat

Seuls `User`, `Session`, `OtpCode`, `VerifiedContact` sont réellement persistés
(Prisma, #218). Tout le cœur métier — portefeuille, séquestre, paiements,
abonnements, messagerie, demandes, avis, quotas, favoris — vit dans des
`new Map()` au niveau module (`server/utils/*Store.ts`). Après un redéploiement,
un `pm2 restart`, un crash ou (en serverless) simplement entre deux invocations,
**les soldes, commandes en séquestre, paiements confirmés et abonnements actifs
sont perdus**. Pour une plateforme qui bloque de l'argent réel, c'est
rédhibitoire avant tout lancement.

Le schéma Prisma (`prisma/schema.prisma`) modélise déjà une partie de ces
entités (`Subscription`, `Payment`, `WalletMovement`, `EscrowOrder`,
`Conversation`, `Message`, `ConversationRead`) mais **ne les lit/écrit pas
encore** — câblage explicitement gaté par l'équipe sur le choix de la cible
d'hébergement/base de production.

## Pourquoi ce n'est pas un simple « remplacer Map par Prisma »

L'analyse du code révèle quatre contraintes qui imposent un séquencement strict
et interdisent une bascule « big bang » :

### 1. Contagion asynchrone
Prisma est asynchrone. Dès qu'une fonction de store devient `async`, **tous ses
appelants doivent `await`**, et se propagent en cascade. Exemple mesuré :
`walletStore` a **23** fichiers consommateurs, `escrowOrderStore` **24**.
`requestStore` importe `subscriptionStore` : migrer les abonnements rend donc
des fonctions de `requestStore` asynchrones, ce qui contamine à son tour les
consommateurs de `requestStore`.

### 2. Intégrité référentielle (clés étrangères)
Les stores en mémoire sont découplés ; Prisma applique les FK. `Payment` référence
`Subscription` **et** `User` ; `Subscription` référence `User`. Un `Payment` ne peut
donc être inséré qu'après existence d'un `Subscription` et d'un `User` réels.
**Ordre imposé :** `User` (déjà fait) → `Subscription` → `Payment`.

### 3. Décalages schéma ↔ domaine
Le type domaine `Subscription` porte `isTrial: boolean` (#281) **absent du modèle
Prisma** : la migration exige d'ajouter la colonne (`isTrial Boolean @default(false)`)
+ une migration Prisma. À vérifier champ par champ pour chaque store (les dates
domaine sont des `number` epoch-ms, les colonnes Prisma des `DateTime` → prévoir
un mapper `toXxx(row)` comme `toUser` dans `userStore.ts`).

### 4. Stores sans modèle Prisma
Plusieurs stores n'ont **aucun** modèle correspondant et nécessitent d'abord de
nouveaux modèles + migrations : `requestStore`, `quotaStore`, `favoriteStore`,
`complaintStore`, `testimonialStore`, `verificationStore`,
`recurringServiceStore`, `providerAvailabilityStore`, `contournementAttemptStore`,
`reviewStore` (le modèle `Review` existe mais n'est pas encore utilisé).

### 5. Isolation des tests
`tests/setup/prismaTestDb.ts` crée la base **une seule fois par run** (globalSetup),
sans reset entre tests. Les stores en mémoire sont aujourd'hui isolés de fait
(état par processus). Une fois sur Prisma, les tests devront soit utiliser des IDs
uniques par cas, soit un nettoyage `beforeEach`/`afterEach` (`deleteMany`) par table
touchée, pour rester reproductibles. Les tests de store existants
(`subscriptionStore.test.ts`, `paymentStore.test.ts`, …) devront être réécrits en
`async` et créer les entités liées réelles (user, subscription) pour respecter les FK.

## Décision

Migrer **store par store, un PR par store**, dans l'ordre de dépendance ci-dessous,
chaque PR laissant les 443 tests verts. Aucun « big bang ». Prérequis transverse :
trancher la base de production (SQLite ne tient pas la concurrence d'écriture d'une
prod — cible recommandée : PostgreSQL managé, ex. Neon/Supabase) — voir #341 et le
chantier hébergement.

### Ordre de migration (chaque étape = 1 PR, tests verts)

| Étape | Store | Modèle Prisma | Pré-requis | Blast radius |
|---|---|---|---|---|
| 0 | *(base de prod tranchée + `provider` datasource)* | — | — | infra |
| 1 | `subscriptionStore` | `Subscription` (+ ajouter `isTrial`) | User (fait) | 7 conso + cascade requestStore |
| 2 | `paymentStore` | `Payment` | Étape 1 (FK) | 4 conso |
| 3 | `walletStore` | `WalletMovement` (pas de FK) | — | 23 conso |
| 4 | `walletRechargeStore` | *(nouveau modèle `WalletRecharge`)* | Étape 3 | 2 conso |
| 5 | `escrowOrderStore` | `EscrowOrder` (pas de FK) | Étapes 3–4 | 24 conso |
| 6 | `conversationStore` | `Conversation`/`Message`/`ConversationRead` | — | messagerie |
| 7 | `requestStore` + `quotaStore` | *(nouveaux modèles)* | Étape 1 | matching |
| 8 | `reviewStore`, `favoriteStore`, `verificationStore`, `complaintStore`, `testimonialStore`, `recurringServiceStore`, `providerAvailabilityStore`, `contournementAttemptStore` | *(nouveaux modèles)* | selon liens | divers |

### Patron d'implémentation (à répliquer, calqué sur `userStore.ts`)

```ts
import { prisma } from '~~/server/utils/prisma'
import type { Subscription as PrismaSub } from '@prisma/client'

function toSubscription(row: PrismaSub): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    plan: row.plan as PlanSlug,
    status: row.status as SubscriptionStatus,
    dateDebut: row.dateDebut?.getTime() ?? null,
    dateFin: row.dateFin?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    isTrial: row.isTrial,
  }
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const row = await prisma.subscription.findFirst({ where: { userId } })
  return row ? toSubscription(row) : null
}
```

- Signatures : `sync` → `async` (retour `Promise<…>`), `await` propagé chez tous les appelants (`server/api/**` et stores dépendants).
- Concurrence : les opérations « lire-puis-écrire » (ex. `resolvePayment`, activation d'abonnement) doivent passer en **transaction** (`prisma.$transaction`) ou en update conditionnel (`updateMany` avec `where: { status: 'pending' }`) pour préserver l'idempotence des webhooks sous accès concurrent — ce que la `Map` mono-thread masquait.
- Tests : réécriture `async` + isolation (IDs uniques ou `deleteMany` ciblé) ; conserver les invariants inter-stores (`escrowOrderFullPaymentInvariant.test.ts`).

## Conséquences

- **Positif :** données financières durables, intégrité référentielle réelle,
  idempotence des webhooks garantie sous concurrence, base saine pour la prod.
- **Coût :** effort significatif réparti sur ~8 PR ; réécriture des tests de store ;
  passage transactionnel des chemins critiques.
- **Risque si non fait :** perte de fonds/abonnements en production — bloquant.

## À trancher avant l'étape 1

1. Base de production (recommandation : PostgreSQL managé).
2. Confirmer le champ `isTrial` sur `Subscription` (et auditer les autres décalages
   schéma ↔ types domaine).
3. Stratégie d'isolation de test retenue (IDs uniques vs. `deleteMany`).
