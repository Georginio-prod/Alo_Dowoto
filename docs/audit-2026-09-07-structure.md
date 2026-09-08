# Audit structure et clean code — 7 septembre 2026

## Conclusion

La structure est saine pour un monorepo composé de deux applications
déployables : un front Nuxt statique et une API Express avec PostgreSQL. Les
responsabilités sont lisibles et les chemins d'exécution sont séparés. Ce n'est
pas une architecture de microservices — ce n'est ni nécessaire ni souhaitable
à ce stade.

```text
app/                 application web Nuxt, sans logique métier serveur
backend/
  src/routes/        routes HTTP et autorisation
  src/controllers/   adaptation HTTP
  src/services/      règles métier
  src/repositories/  accès Prisma
  src/validation/    schémas Zod
  prisma/            schéma et migrations PostgreSQL
docker/              reverse proxy nginx
tests/               tests unitaires du front
backend/src/**/__tests__/
                     tests HTTP et métier de l'API
```

## Corrections appliquées pendant cet audit

- Tous les appels API du front passent désormais par `apiFetch`, qui force les
  cookies de session pour les requêtes same-origin.
- Les indicateurs d'environnement partagés (production et annuaire de démo)
  sont centralisés dans `backend/src/config/env.ts`.
- Les statuts de séquestre sont définis une seule fois dans leur repository.
- Les tests backend sont séquentiels : ils partagent une base PostgreSQL et ne
  peuvent donc pas nettoyer des données en parallèle.
- Le lockfile racine est l'unique lockfile npm du workspace ; le verrou local
  redondant du backend a été supprimé.
- Le lockfile a été régénéré avec Node 22, la version des images de production.

## Vérifications effectuées

- Build du front statique dans une image Node 22 : réussi.
- Build TypeScript et génération Prisma de l'API dans une image Node 22 :
  réussis.
- Tests frontend : 14 fichiers, 71 tests réussis.
- Tests backend sur PostgreSQL isolé : 46 fichiers, 377 tests réussis.
- `git diff --check` : aucune erreur d'espacement.

## Dette structurante restante

| Priorité | Constat | Recommandation |
| --- | --- | --- |
| Haute | `npm audit` remonte 10 vulnérabilités, dont 6 élevées. | Préparer une mise à niveau dédiée et testée des dépendances ; ne pas utiliser `npm audit fix --force` aveuglément. |
| Moyenne | `app/types/api.ts` réexporte des types internes du backend. | Créer plus tard `packages/contracts` à partir des schémas Zod ou d'OpenAPI. Le front ne devra alors plus importer `backend/src/**`. |
| Moyenne | Le front lit les référentiels via l'alias `#domain-data` vers `backend/src/data`. | Extraire ces données pures dans `packages/domain-data` lorsque les contrats seront extraits. Cela conservera la source unique sans dépendance front vers backend. |
| Moyenne | L'annuaire de démonstration est encore embarqué dans `providerDirectoryService`. | Déplacer les fiches de démonstration vers un seed ou une fixture explicitement activée en développement. |
| Basse | Les adaptateurs externes (mail, SMS, OAuth, IA) lisent encore certaines variables directement. | Les faire passer progressivement par des accesseurs de configuration testables, sans figer les secrets qui doivent rester relus à l'exécution. |

## Règle d'évolution

Conserver le sens des dépendances suivant : `app → packages` et
`backend → packages`. Aucun code de `app/` ne doit importer du code exécutable
de `backend/`, et aucun service backend ne doit importer l'interface Nuxt.

L'extraction des contrats et des référentiels partagés est le prochain chantier
structurant ; elle doit être faite dans une PR dédiée, car elle touche les
contrats publics des deux applications.
