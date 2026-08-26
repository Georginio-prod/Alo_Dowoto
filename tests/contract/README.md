# Tests de contrat — filet de sécurité de l'extraction backend

Ce dossier est le **garde-fou du « zéro changement fonctionnel »** du chantier
d'extraction du backend Nitro vers Express (voir `docs/adr/` — ADR-0014/0015/0016).

Le principe : on **fige le comportement de l'API actuelle** (routes `server/api/**`,
servies par Nitro) — surface des routes, puis statut + corps de réponse — puis on
**rejoue exactement les mêmes requêtes** contre le futur backend Express. Si un
instantané diffère, c'est qu'un comportement observé par le web, le mobile ou le
dashboard a changé : la migration n'est pas iso-fonctionnelle et doit être corrigée.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `loadApiRoutes.ts` | Découvre toutes les routes `server/api/**` via `import.meta.glob` et les convertit en routes h3 (`:param`, `**`). |
| `contractServer.ts` | Monte l'intégralité de ces routes sur un vrai serveur HTTP de test (réutilise `tests/setup/httpTestApp.ts`). |
| `routeInventory.contract.test.ts` | Fige la **surface** (liste méthode + chemin). Toute route ajoutée/retirée fait bouger l'instantané. |
| `behaviour.contract.test.ts` | Fige le **comportement** (statut + corps) route par route. Démarre par une route publique déterministe. |

## Lancer

```bash
npm run test -- tests/contract
```

Mettre à jour les instantanés **seulement** après un changement voulu :

```bash
npm run test -- tests/contract -u
```

## Portée actuelle et suite

- ✅ Inventaire complet des 183 routes.
- ✅ Amorçage : montage de toute l'application + première capture publique.
- ⏭️ À étendre domaine par domaine (auth, prestataires, messagerie, séquestre,
  admin…) avec les scénarios authentifiés (`tests/setup/httpAuth.ts` fournit un
  cookie de session réel) : un scénario = méthode + chemin + rôle + corps + état
  de départ, capturé en instantané.
- ⏭️ **Rejeu** : quand `backend/` (Express) existera, un runner enverra le même
  jeu de scénarios à son URL et comparera aux instantanés capturés ici.

> Les en-têtes (CSP à nonce par requête, HSTS prod-only — `server/middleware/security.ts`)
> ne sont volontairement pas figés à ce stade : non déterministes et portés tels
> quels. Le contrat porte d'abord sur statut + corps.
