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
| `replay/` | **Runner de rejeu Nitro ↔ Express** (Phase 2). Envoie les mêmes requêtes aux deux runtimes et affirme statut + corps iso. |

## Rejeu Nitro ↔ Express (`replay/`)

Depuis la Phase 2 (portage des routes vers Express, ADR-0017), chaque domaine
porté est validé par **rejeu réel** : les mêmes requêtes partent vers le serveur
Nitro de référence ET vers le backend Express, sur la **même base de test**, et
l'on compare statut + corps.

| Fichier | Rôle |
| --- | --- |
| `replay/replay.ts` | Cœur générique : `callServer` (fetch) + `expectIso` (rejoue les deux, compare après normalisation). |
| `replay/nitroServer.ts` | Démarre le Nitro de référence en **répliquant l'enveloppe d'erreur JSON de production** (`{ error, url, statusCode, statusMessage, message, data }`) que le h3 brut du harnais n'applique pas. |
| `replay/backendApp.ts` | Démarre le vrai backend Express (`createServer`) sur un port éphémère (import dynamique → `DATABASE_URL` déjà fixé). |
| `replay/normalize.ts` | Normaliseurs des champs **non déterministes** : horodatages des seeds, ids/dates générés à l'écriture, et enveloppe d'erreur (écarte `url`/`statusMessage`, comme le contrat n'a jamais figé les en-têtes). |
| `replay/testimonials.replay.test.ts` | 1er domaine rejoué (gabarit) : GET (fr/en), POST valide, POST invalides (400 iso). |

> Un domaine porté = un fichier `replay/<domaine>.replay.test.ts` : monter ses
> handlers Nitro (`startNitroServer`), lister les scénarios, choisir le
> normaliseur adéquat. `expectIso` fait échouer tout écart réel de comportement.

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
- ✅ **Rejeu Nitro ↔ Express** (`replay/`) : runner opérationnel, 1er domaine
  rejoué (`testimonials`). Voir la section dédiée ci-dessus.
- ⏭️ À étendre domaine par domaine (auth, prestataires, messagerie, séquestre,
  admin…) avec les scénarios authentifiés (`tests/setup/httpAuth.ts` fournit un
  cookie de session réel) : un scénario = méthode + chemin + rôle + corps + état
  de départ, rejoué contre les deux runtimes.

> Les en-têtes (CSP à nonce par requête, HSTS prod-only — `server/middleware/security.ts`)
> ne sont volontairement pas figés à ce stade : non déterministes et portés tels
> quels. Le contrat porte d'abord sur statut + corps.
