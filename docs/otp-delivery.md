# Envoi des codes OTP — SMS et email

Ce document décrit comment les codes de vérification (#23) sont envoyés, ce
qu'il faut configurer pour que **le téléphone et l'email fonctionnent de la
même manière**, et comment diagnostiquer un canal qui n'envoie rien.

## Un seul contrat, deux drivers

```text
POST /api/auth/otp/send { method: 'phone' | 'email', value }
        │
        ▼
otpService.requestOtp ── normalizeContact ──► "+228XXXXXXXX" ou "email@…"
        │   génère un code à 6 chiffres, TTL 10 min, cooldown 30 s, 5 essais
        │
        ├── method = phone ──► utils/sms.ts    ──► Brevo SMS, sinon Twilio
        └── method = email ──► utils/email.ts  ──► Brevo email
                                   │
                                   └── aucun provider ? ──► hors prod : devCode
                                                            en prod   : 503
```

Le code, le message (`WorkTogo : votre code de vérification est 123456. Il
expire dans 10 minutes.`), le TTL, le cooldown, le plafond de tentatives, les
erreurs et la preuve de vérification consommée par `POST /api/auth/session`
sont **identiques** pour les deux canaux. Seul le driver d'envoi change. Les
notifications (#360) réutilisent les mêmes drivers.

Fichiers :

- [`backend/src/services/otpService.ts`](../backend/src/services/otpService.ts) — logique métier, commune aux deux canaux.
- [`backend/src/utils/email.ts`](../backend/src/utils/email.ts) — driver Brevo email.
- [`backend/src/utils/sms.ts`](../backend/src/utils/sms.ts) — drivers Brevo SMS (prioritaire) et Twilio (repli).
- [`backend/src/utils/deliveryStatus.ts`](../backend/src/utils/deliveryStatus.ts) — état des canaux pour `/api/health/delivery` et le log de démarrage.

## Comportement par environnement

| Canal sans provider  | Hors production (`NODE_ENV` ≠ `production`)                           | Production                                                        |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Réponse de `/send`   | `200 { ok, expiresInSeconds, devCode }` — code affiché dans l'écran OTP | `503` « L'envoi par SMS/email n'est pas disponible pour le moment. » |
| Côté serveur         | `[otp] Code 123456 pour +228… (expire dans 600s)`                     | `[otp] Aucun provider SMS configuré en production — envoi refusé` |

Avec un provider configuré, le code part réellement et **`devCode` n'est jamais
renvoyé**, quel que soit l'environnement. Si le provider échoue (`502`), le
cooldown est libéré : l'utilisateur peut redemander un code immédiatement.

## Configuration (`backend/.env` uniquement)

Les variables sont lues par le backend Express depuis `backend/.env` (ou les
variables d'environnement de l'hébergeur). **Le `.env` racine n'est pas lu par
le backend** : une clé posée là ne configure rien.

### Email — Brevo (gratuit)

1. Compte Brevo (300 emails/jour offerts, aucun domaine requis).
2. *Senders & Domains → Senders* : ajouter et **confirmer** l'adresse expéditrice.
3. *SMTP & API → API Keys* : créer une clé (`xkeysib-…`). Pas la clé SMTP.
4. Renseigner :

```dotenv
BREVO_API_KEY=xkeysib-…
EMAIL_FROM=adresse-verifiee@exemple.tg
EMAIL_FROM_NAME=WorkTogo
```

### SMS — option 1 : Brevo (même clé, payant)

Brevo envoie aussi des SMS, avec la **même clé API**, mais il faut acheter des
crédits SMS et déclarer un expéditeur (*Transactional → SMS → Settings*).

```dotenv
BREVO_SMS_SENDER=WorkTogo   # alphanumérique, 11 caractères max
```

Le destinataire est transmis au format international sans `+` (`22890000000`).

### SMS — option 2 : Twilio (repli)

Utilisé seulement si `BREVO_SMS_SENDER` est vide. Un compte d'essai Twilio ne
peut envoyer qu'aux numéros vérifiés dans la console : pour le public togolais,
il faut un compte payant et un numéro/Messaging Service autorisé vers le Togo.

```dotenv
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=+1…        # ou SID d'un Messaging Service (MG…)
```

## Vérifier que les deux canaux fonctionnent

1. **Au démarrage** du backend, une ligne résume l'état des canaux :

   ```text
   [delivery] email: brevo | sms: aucun (repli devCode)
   ```

   En production, un canal manquant est journalisé en erreur.

2. **À chaud**, sans secret exposé :

   ```bash
   curl http://localhost:3001/health/delivery
   ```

   ```json
   { "status": "ok", "email": "brevo", "sms": null }
   ```

   Parité atteinte quand `email` **et** `sms` sont non nuls.

3. **De bout en bout** : `POST /api/auth/otp/send` avec `{ "method": "phone",
   "value": "90000000" }` puis `{ "method": "email", "value": "…" }` ne doit
   renvoyer **ni `devCode`** ni erreur, et le code doit arriver par les deux
   canaux.

## Dépannage

| Symptôme                                              | Cause probable                                                       | Correction                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `devCode` renvoyé alors que Brevo est « configuré »   | Variables dans le `.env` racine, pas dans `backend/.env`             | Déplacer les variables ; vérifier avec `/health/delivery`            |
| `email: brevo` mais `sms: null`                       | `BREVO_SMS_SENDER` vide et aucune variable Twilio                    | Choisir l'option 1 ou 2 ci-dessus                                    |
| `502` « Impossible d'envoyer l'email » + `Brevo a répondu 401` | Clé API invalide ou clé SMTP utilisée à la place de la clé API | Régénérer une clé dans *SMTP & API → API Keys*                       |
| `502` + `Brevo a répondu 400` (sender)                | `EMAIL_FROM` non vérifié dans Brevo                                  | Confirmer l'expéditeur dans *Senders*                                |
| `502` + `Brevo a répondu 402` / `not_enough_credits`  | Crédits SMS épuisés                                                  | Recharger les crédits SMS Brevo                                      |
| `502` + `Twilio a répondu 400/403` (unverified)       | Compte d'essai : destinataire non vérifié                            | Passer en compte payant ou vérifier le numéro de test                |
| `503` en production                                   | Canal sans provider                                                  | Configurer le canal dans les variables de l'hébergeur et redéployer  |

## Tests

- `backend/src/utils/__tests__/email.test.ts` et `sms.test.ts` : forme exacte
  des appels Brevo/Twilio et gestion d'erreur, `fetch` mocké.
- `backend/src/services/__tests__/otpService.test.ts` : parité SMS/email, repli
  dev, 503 en production, libération du cooldown après 502, vérification.
- `backend/src/routes/__tests__/auth.test.ts` : contrat HTTP des deux canaux.

`backend/vitest.config.mts` et `playwright.config.ts` vident les variables
provider : **aucun test n'envoie de vrai message**, même avec un `backend/.env`
configuré.
