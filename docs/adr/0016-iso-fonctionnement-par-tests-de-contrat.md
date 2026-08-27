# ADR 0016 — Iso-fonctionnement garanti par des tests de contrat

**Statut :** Accepté (2026-08-27)
**Contexte :** [ADR-0014](0014-extraction-backend-express.md) et
[ADR-0015](0015-partage-logique-metier-et-donnees.md). Le site est **déjà en
ligne** : web, mobile et dashboard doivent continuer à fonctionner **à
l'identique** pendant et après l'extraction.

## Constat

Une réécriture de la plomberie HTTP (Nitro → Express) et un changement de moteur
de base (SQLite → Postgres) introduisent un risque de **régression silencieuse** :
un code de statut, un format de réponse, un en-tête ou une nuance d'auth qui
change sans qu'on le voie, et un client (surtout le mobile, difficile à
redéployer) casse.

## Décision

1. **Figer le comportement actuel avant de migrer.** Le harnais `tests/contract/`
   monte l'API Nitro réelle et capture, par route, la surface (méthode + chemin)
   puis le comportement (statut + corps) en instantanés de référence.
2. **Rejouer le même jeu de requêtes contre le backend Express** : un domaine
   n'est considéré porté que si son rejeu est **identique** aux instantanés.
3. **Répliquer fidèlement le format d'erreur Nitro** — `{ error: true,
   statusCode, message, data }` — dans le gestionnaire d'erreurs Express
   (`backend/src/middleware/errorHandler.ts`).
4. **Bascule par domaine et réversible** via le point de bascule côté front
   (`app/composables/useApi.ts`, `NUXT_PUBLIC_MIGRATED_API_PREFIXES`) : un
   domaine ne passe au backend qu'après contrat vert, et revient à Nitro
   instantanément par configuration en cas de problème.

## Conséquences

- « Definition of done » d'un domaine porté = rejeu de contrat vert + bascule du
  préfixe + suppression de la route Nitro correspondante.
- Les en-têtes non déterministes (CSP à nonce par requête, HSTS prod-only) ne
  sont pas figés à l'octet ; le contrat porte d'abord sur statut + corps + auth.
- Le harnais de contrat est un livrable de test permanent, pas jetable.
