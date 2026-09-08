# PostgreSQL et Prisma

## Source de vérité

Le schéma est [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
Les migrations SQL versionnées dans `backend/prisma/migrations/` sont la source
de vérité pour toute base partagée. La séquence complète construit le schéma
PostgreSQL; la migration `20260907000000_complete_postgresql_refactor` ajoute
les demandes, quotas, services récurrents et alertes anti-fraude persistants.
L'ancien schéma SQLite et ses migrations ont été retirés.

## Domaines principaux

| Domaine | Modèles principaux |
| --- | --- |
| Comptes et accès | `User`, `Session`, `OtpCode`, `VerifiedContact` |
| Prestataires | `Sector`, `SubSector`, `ProviderProfile`, `Verification`, `KycDecision` |
| Mise en relation | `ServiceRequest`, `ServiceRequestMatch`, `RecurringService`, `MonthlyUsageCounter`, `Conversation`, `Message`, `ConversationRead`, `Favorite` |
| Paiement | `Subscription`, `Payment`, `WalletRecharge`, `WalletMovement`, `EscrowOrder` |
| Qualité et sûreté | `Review`, `Complaint`, `Notification`, `ContournementAttempt`, `FraudAlert`, `WebhookNonce` |
| Administration | `AuditLog`, `AdminNote`, `Coupon`, `PlatformSettings`, `SiteContent`, `NotificationCampaign` |

Le solde n'est jamais stocké : il est recalculé à partir du journal
append-only `WalletMovement`. Les modifications composite du séquestre sont
effectuées dans des transactions Prisma.

## Opérations courantes

```bash
# générer le client Prisma après un clone ou un changement de schéma
npm --prefix backend run prisma:generate

# appliquer uniquement les migrations versionnées
npm --prefix backend run prisma:deploy

# créer une migration de développement
npm --prefix backend run prisma:migrate -- --name ajout_de_champ

# inspecter la base locale
npm --prefix backend run prisma:studio
```

`prisma:push` est réservé aux bases de test jetables. Il ne doit jamais être
utilisé contre une base de staging ou de production.

## Connexion locale

Le conteneur de développement publie PostgreSQL sur `localhost:5433` :

```text
postgresql://worktogo:worktogo@localhost:5433/worktogo?schema=public
```

Cette valeur est fournie dans `backend/.env.example`. En conteneur, l'API
utilise le réseau Compose et la même base est accessible via l'hôte `postgres`
sur le port 5432.
