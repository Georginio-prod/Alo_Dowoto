# ADR 0007 — Harnais de test d'intégration HTTP

**Statut :** Adopté (2026-07-21)
**Contexte :** issue #261 (« Tests d'intégration HTTP sur les routes escrow / paiement / webhook »)

## Constat

254 tests unitaires, tous verts, mais 100 % au niveau des stores
(`escrowOrderStore.test.ts`, `paymentStore.test.ts`, etc.) — aucun test
n'exerçait un handler de route via une vraie requête HTTP. C'est
précisément là que vivent les bugs d'autorisation et d'enchaînement
d'états (un contrôle de propriété oublié, un état escrow atteignable dans
le mauvais ordre), invisibles quand on appelle les fonctions du store
directement.

## Options considérées

1. **`@nuxt/test-utils`** (`setup()` + `$fetch` contre une instance Nuxt
   complète) : le plus fidèle à la production, mais nécessite un build Nuxt
   complet par run de test — lourd et lent, et non installé dans ce dépôt.
2. **`H3Event` mocké à la main** : rapide, mais fragile — un `H3Event` réel
   porte de nombreux champs/méthodes internes (node req/res, contexte de
   routage) faciles à mal reproduire, avec le risque de tester un
   comportement qui ne correspond pas à un vrai H3Event.
3. **Un vrai serveur `node:http` + une vraie instance h3** (retenue) : h3
   est la brique sur laquelle Nitro est lui-même construit — monter une
   route avec `createApp()`/`createRouter()`, l'exposer sur un port
   éphémère via `node:http`, puis lui envoyer de vraies requêtes `fetch`
   donne un comportement HTTP authentique (cookies, en-têtes, corps JSON,
   codes de statut) sans le coût d'un build Nuxt complet.

## Décision

Option 3, implémentée dans `tests/setup/httpTestApp.ts`
(`startTestServer`) — voir le commentaire en tête de fichier pour le détail.

Complément nécessaire : les handlers de route (`server/api/**`) n'ont
eux-mêmes aucun import — Nitro les injecte au moment du build. Pour rester
chargeables tels quels sous Vitest, `vitest.config.ts` reçoit une seconde
instance d'`unplugin-auto-import` qui réplique cette injection : `dirs:
['server/utils']` pour les helpers du projet, plus une liste explicite des
primitives h3 que Nitro réexpose globalement (`defineEventHandler`,
`getRouterParam`, `readBody`, `createError`, etc.). Basé sur `unimport`, la
même librairie que Nuxt utilise en interne — même mécanisme, pas une
réimplémentation.

`tests/setup/httpAuth.ts` (`createAuthedUser`) crée un vrai compte + une
vraie session (Prisma, comme en production) et renvoie le cookie prêt à
l'emploi — l'autorisation réelle (`requireClientRole`/`requireProviderRole`/
contrôle de propriété de ressource) est donc exercée de bout en bout, pas
simulée.

Chaque fichier de test HTTP porte `// @vitest-environment node` en tête :
l'environnement par défaut du projet (`happy-dom`, pour les tests de
composants Vue) fournit un `fetch` qui applique la politique de même
origine comme un vrai navigateur et bloquerait toute requête vers le
serveur de test local — le `fetch` natif de Node (undici) n'a pas cette
contrainte.

## Couverture livrée

- `tests/http/escrowRoutes.http.test.ts` : cycle de vie complet
  (`pay`/`deliver`/`receive`/`dispute`/`cancel`), chemin nominal **et** refus
  d'autorisation pour chacune des 5 routes, plus une orchestration de bout
  en bout (`pay → deliver → receive` enchaînés) et un état atteint dans le
  mauvais ordre.
- `tests/http/webhooks.http.test.ts` : signature HMAC valide/invalide/absente,
  idempotence (rejeu), paiement/recharge inconnu, pour les deux webhooks
  (`payments/webhook`, `wallet/webhook`).
- `tests/http/googleCallback.http.test.ts` : configuration OAuth manquante,
  refus de consentement, et 3 variantes de l'état anti-CSRF (mismatch,
  absent, code/state manquant).

## Hors périmètre

L'échange du code d'autorisation contre un profil Google
(`fetchGoogleProfile`, appel réseau vers l'API Google) n'est pas testé de
bout en bout — nécessiterait soit un compte Google de test réel, soit un
mock du module qui n'apporterait pas la même confiance qu'un test contre le
vrai comportement. Les scénarios les plus à risque pour cette route
(état anti-CSRF, configuration manquante, consentement refusé) sont
couverts ; la liaison de compte existant reste testée unitairement
(`tests/googleAuth.test.ts`) plutôt qu'en intégration HTTP.

## Critères d'acceptation de l'issue — état

- [x] Harnais de test HTTP choisi et documenté (ci-dessus).
- [x] Au moins un test d'intégration par route listée, couvrant le chemin
      nominal et un cas de refus d'autorisation.
- [x] Webhook : test de rejeu (idempotence) et de signature invalide.
