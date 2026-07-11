# Backend Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger tous les constats **backend** de l'audit d'architecture (`docs/audit-architecture-doggo.md`), du nettoyage d'hygiène jusqu'à la sécurisation du canal MQTT, sans toucher au frontend ni à l'admin/back-office.

**Architecture:** AdonisJS 7 / Lucid / PostgreSQL, Clean Architecture modulaire (domain / application / infrastructure). On préserve strictement les patterns existants (ports & providers, use-cases, value objects). Les correctifs vont de moins risqué (hygiène) à plus impactant (broker MQTT), en 4 lots.

**Tech Stack:** TypeScript (NodeNext), AdonisJS 7, Lucid ORM, Vine (validation), BullMQ, MQTT.js, Japa (tests), ESLint 9 flat config.

## Global Constraints

- **Backend uniquement.** Ne modifier aucun fichier sous `frontend/`.
- **Ne pas toucher à l'admin / back-office** (consigne projet).
- **Imports NodeNext** : les imports relatifs portent l'extension `.js` ; les imports par alias (subpath imports du `package.json`) s'écrivent **sans** `.js` (ex. `#app/modules/share/exceptions/domain-error`).
- **Aliases disponibles** (voir `backend/package.json` › `imports`) : `#app/*` (catch-all → `./app/*`), `#dogs/*`, `#users/*`, `#auth/*`, `#middleware/*`, `#start/*`, `#config/*`, `#tests/*`, `#database/*`, `#providers/*`… Il **n'existe pas** d'alias `#missions`, `#share`, `#actions`, `#robot-communication`, `#notifications` : ces modules se réfèrent via `#app/modules/<module>/...`.
- **TDD** : chaque tâche écrit le test qui échoue avant l'implémentation.
- **Commits fréquents**, un par tâche minimum. Le repo n'est pas encore git-initialisé sous `backend/` — si `git status` échoue, faire `git init` d'abord (à confirmer avec l'utilisateur).
- Commandes de vérification, exécutées **depuis `backend/`** :
  - Types : `npm run typecheck`
  - Lint : `npm run lint`
  - Tests unitaires : `node ace test unit`
  - Tests fonctionnels : `node ace test functional`
  - Filtrer un fichier : `node ace test unit --files="<partie-du-nom>.spec.ts"`

## Périmètre / Hors périmètre

**Dans ce plan (backend) :** MQTT (validation payloads + broker auth/TLS/ACL), course TOCTOU au lancement de mission, CORS, handler d'exceptions + `DomainError`, DRY repositories, port `RealtimeBroadcaster` pour `NotificationService`, code mort / noms fautés, normalisation des imports, `.env.example`, réparation du suite de tests fonctionnels.

**Explicitement hors périmètre (à traiter plus tard) :**
- Tous les constats frontend (Pinia vs refs, `useLogin`, token `localStorage`, garde de route admin, `HelloWorld.vue`, `IAuthRepository` dupliqué front, `vue.svg`/`vite.svg`).
- **Extraction i18n vers le frontend** (constat 🟢 NotificationService) : déplacer les libellés FR côté front change le contrat de notification et impose du travail frontend → **différé**. La tâche 8 ne fait que la partie backend sûre (masquer `transmit` derrière un port).
- Couverture fonctionnelle **exhaustive** du cycle de mission : la tâche 9 met en place l'infrastructure de test + un test happy-path représentatif ; la couverture complète est un suivi.

## File Structure

**Nouveaux fichiers :**
- `backend/app/modules/share/infrastructure/database/to-paginated-result.ts` — helper de pagination partagé (Task 7).
- `backend/app/modules/notifications/domain/contracts/realtime-broadcaster.ts` — port SSE (Task 8).
- `backend/app/modules/notifications/infrastructure/realtime/transmit-realtime-broadcaster.ts` — adaptateur `transmit` (Task 8).
- `backend/app/modules/missions/domain/exceptions/mission-not-found.error.ts` — remplace le fichier fauté (Task 1).
- `backend/app/modules/dogs/domain/exceptions/robot-dog-serial-number-already-exists.error.ts` — remplace le fichier fauté (Task 2).
- `backend/database/migrations/<ts>_add_unique_active_run_per_dog_index.ts` — index unique partiel (Task 10).
- `backend/app/modules/robot-communication/infrastructure/mqtt/validators/*.ts` — validateurs Vine des payloads robot (Task 11).
- `backend/tests/functional/helpers/auth.ts` — harnais d'auth Firebase de test (Task 9).
- `backend/tests/functional/missions/...` — tests HTTP mission (Task 9/10).
- `backend/scripts/normalize-imports.mjs` — codemod jetable (Task 5).

**Fichiers modifiés notables :**
- `backend/config/cors.ts`, `backend/start/env.ts`, `backend/.env.example`, `backend/eslint.config.js`, `backend/adonisrc.ts`.
- `backend/app/exceptions/handler.ts`, `backend/app/modules/share/exceptions/domain-error.ts` + ~13 classes d'erreur.
- `backend/app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts`, `mission-run.repository.implementation.ts`.
- `backend/app/modules/notifications/application/notification.service.ts` + son provider.
- `backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`.
- `backend/mosquitto/mosquitto.conf`, `backend/docker-compose.yml`.

---

# LOT A — Hygiène (risque quasi nul)

## Task 1 : Consolider `MissionNotFoundError` (supprimer le doublon fauté + renommer le fichier canonique)

**Contexte vérifié :**
- `invalid-mission-not-fout.error.ts` exporte la classe **canonique** `MissionNotFoundError` (utilisée par 19 fichiers, dont `handler.ts` et `show-mission.use-case.ts`). Fichier au nom fauté.
- `invalid-mission-not-fount.error.ts` exporte un **doublon mort** `InvalidMissionNotFountError`, référencé **uniquement** par `tests/unit/mission/application/show-mission.spec.ts` — alors que le use-case lève en réalité `MissionNotFoundError`. Ce test « passe » aujourd'hui par un matcher permissif ; il faut le pointer sur la classe réellement levée.

**Files:**
- Create: `backend/app/modules/missions/domain/exceptions/mission-not-found.error.ts`
- Delete: `backend/app/modules/missions/domain/exceptions/invalid-mission-not-fout.error.ts`
- Delete: `backend/app/modules/missions/domain/exceptions/invalid-mission-not-fount.error.ts`
- Modify: `backend/tests/unit/mission/application/show-mission.spec.ts`
- Modify: les 19 fichiers important `invalid-mission-not-fout.error`

**Interfaces:**
- Produces: `export class MissionNotFoundError extends DomainError` (constructeur `(missionId: string)`), importable via `#app/modules/missions/domain/exceptions/mission-not-found.error`.

- [ ] **Step 1 : Écrire le test qui échoue (migrer le test sur la classe canonique)**

Dans `backend/tests/unit/mission/application/show-mission.spec.ts`, remplacer l'import et l'assertion :

```ts
// remplace l'ancien import InvalidMissionNotFountError
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
```
```ts
// dans le test "should throw an error if mission is not found"
await assert.rejects(() => useCase.execute(unknownId), MissionNotFoundError)
```

- [ ] **Step 2 : Lancer le test → il échoue (module introuvable)**

Run: `node ace test unit --files="show-mission.spec.ts"`
Expected: FAIL — `Cannot find module '.../mission-not-found.error'`.

- [ ] **Step 3 : Créer le fichier canonique**

`backend/app/modules/missions/domain/exceptions/mission-not-found.error.ts` :
```ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'MISSION_NOT_FOUND'

  constructor(missionId: string) {
    super(`Mission with id ${missionId} was not found`)
  }
}
```
> Note : `httpStatus`/`code` anticipent la Task 6. Si la Task 6 n'est pas encore faite, `DomainError` n'a pas encore ces champs — ils sont alors juste des propriétés supplémentaires inertes, sans effet. Le code compile dans les deux cas.

- [ ] **Step 4 : Réécrire les 19 imports vers le nouveau chemin**

Détecter :
```bash
cd backend && grep -rln "invalid-mission-not-fout\b\|invalid-mission-not-fout'" app tests | grep -v "invalid-mission-not-fount"
```
Pour chaque fichier, remplacer toute occurrence de `invalid-mission-not-fout.error` par `mission-not-found.error` (le nom de classe importé `MissionNotFoundError` est inchangé). Commande de remplacement en masse :
```bash
cd backend && grep -rl "invalid-mission-not-fout.error" app tests \
  | xargs sed -i '' 's#invalid-mission-not-fout\.error#mission-not-found.error#g'
```

- [ ] **Step 5 : Supprimer les deux fichiers fautés**

```bash
cd backend && rm app/modules/missions/domain/exceptions/invalid-mission-not-fout.error.ts \
                app/modules/missions/domain/exceptions/invalid-mission-not-fount.error.ts
```

- [ ] **Step 6 : Vérifier types + tests**

Run: `npm run typecheck && node ace test unit`
Expected: PASS (aucune référence résiduelle aux fichiers supprimés).

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "refactor(missions): consolidate MissionNotFoundError, remove misspelled duplicate"
```

---

## Task 2 : Renommer le fichier fauté `robot-dog-serial-number-already-existe`

**Contexte :** la classe `RobotDogSerialNumberAlreadyExistsError` est bien orthographiée ; seul le **fichier** est fauté (`...already-existe.error.ts`). 3 sites l'importent : `handler.ts`, `create-robot-dog.use-case.ts`, `create-robot-dog.spec.ts`.

**Files:**
- Rename: `.../dogs/domain/exceptions/robot-dog-serial-number-already-existe.error.ts` → `...already-exists.error.ts`
- Modify: les 3 fichiers important l'ancien chemin

- [ ] **Step 1 : Créer le fichier au bon nom (avec `httpStatus`/`code` pour la Task 6)**

`backend/app/modules/dogs/domain/exceptions/robot-dog-serial-number-already-exists.error.ts` :
```ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogSerialNumberAlreadyExistsError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ROBOT_DOG_SERIAL_NUMBER_ALREADY_EXISTS'

  constructor(serialNumber: string) {
    super(`Robot dog with serial number ${serialNumber} already exists.`)
  }
}
```

- [ ] **Step 2 : Réécrire les imports puis supprimer l'ancien fichier**

```bash
cd backend && grep -rl "robot-dog-serial-number-already-existe.error" app tests \
  | xargs sed -i '' 's#robot-dog-serial-number-already-existe\.error#robot-dog-serial-number-already-exists.error#g'
rm app/modules/dogs/domain/exceptions/robot-dog-serial-number-already-existe.error.ts
```

- [ ] **Step 3 : Vérifier**

Run: `npm run typecheck && node ace test unit --files="create-robot-dog.spec.ts"`
Expected: PASS.

- [ ] **Step 4 : Commit**

```bash
git add -A && git commit -m "refactor(dogs): fix misspelled serial-number-already-exists error filename"
```

---

## Task 3 : Aligner `.env.example` sur le schéma `env.ts`

**Contexte :** `env.ts` exige `MQTT_HOST`, `MQTT_PORT`, `FRONTEND_URL` (non-optionnels), absents de `.env.example` → `cp .env.example .env` échoue au boot.

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1 : Réécrire `.env.example` avec toutes les clés requises**

```dotenv
TZ=UTC
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=app

FIREBASE_API_KEY=
FIREBASE_SERVICE_ACCOUNT_KEYS=
RESEND_API_KEY=

FRONTEND_URL=http://localhost:5173

# MQTT broker (voir Task 11/12 pour l'auth/TLS)
MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_USE_TLS=false
MQTT_CA_PATH=

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```
> `APP_KEY` reste vide dans l'exemple : documenter dans le README de générer via `node ace generate:key`. `MQTT_USERNAME/PASSWORD/USE_TLS/CA_PATH` sont ajoutés ici mais ne seront exigés par `env.ts` qu'après la Task 11 (schéma optionnel) — laisser dès maintenant évite un second passage.

- [ ] **Step 2 : Vérifier le boot avec l'exemple**

```bash
cd backend && cp .env.example /tmp/.env.check && diff <(grep -oE '^[A-Z_]+' .env.example | sort -u) <(grep -oE "Env.schema" start/env.ts >/dev/null; echo)
```
Vérification manuelle : chaque clé non-optionnelle de `start/env.ts` (`APP_KEY`, `HOST`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DB_*`, `FIREBASE_API_KEY`, `RESEND_API_KEY`, `FRONTEND_URL`, `MQTT_HOST`, `MQTT_PORT`, `REDIS_HOST`, `REDIS_PORT`) est présente dans `.env.example`.
Expected: toutes présentes.

- [ ] **Step 3 : Commit**

```bash
git add .env.example && git commit -m "docs(env): sync .env.example with env.ts schema"
```

---

## Task 4 : Restreindre le CORS à `FRONTEND_URL`

**Files:**
- Modify: `backend/config/cors.ts`

- [ ] **Step 1 : Remplacer `origin: true` par une liste blanche**

`backend/config/cors.ts` :
```ts
import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: [env.get('FRONTEND_URL')],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
```

- [ ] **Step 2 : Vérifier types + boot**

Run: `npm run typecheck`
Expected: PASS. (Test manuel optionnel : requête `OPTIONS` depuis une origine tierce → pas de header `Access-Control-Allow-Origin`.)

- [ ] **Step 3 : Commit**

```bash
git add config/cors.ts && git commit -m "security(cors): restrict allowed origin to FRONTEND_URL"
```

---

## Task 5 : Normaliser les imports relatifs `../` vers l'alias `#app/*` + règle ESLint

**Contexte :** 43 fichiers sous `app/` importent en `../../../…`. On convertit **uniquement** les imports remontants (`../`) — les imports même-dossier (`./x.js`) restent idiomatiques. On applique ensuite une règle ESLint pour empêcher la régression.

**Files:**
- Create: `backend/scripts/normalize-imports.mjs` (codemod jetable)
- Modify: jusqu'à 43 fichiers sous `backend/app/`
- Modify: `backend/eslint.config.js`

- [ ] **Step 1 : Écrire le codemod déterministe**

`backend/scripts/normalize-imports.mjs` :
```js
// Convertit les imports/exports relatifs remontants (../) en alias #app/... pour les
// fichiers sous app/. Idempotent. Usage : node scripts/normalize-imports.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve, relative } from 'node:path'

const appRoot = resolve('app')
const files = execSync(`grep -rl "from '\\.\\./" app --include=*.ts`, { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

const RE = /(from\s+['"]|import\(\s*['"])(\.\.\/[^'"]+)(['"])/g

for (const file of files) {
  const abs = resolve(file)
  const src = readFileSync(abs, 'utf8')
  const out = src.replace(RE, (match, pre, spec, post) => {
    const targetAbs = resolve(dirname(abs), spec) // ex: /.../app/modules/share/exceptions/domain-error.js
    const rel = relative(appRoot, targetAbs) // ex: modules/share/exceptions/domain-error.js
    if (rel.startsWith('..')) return match // cible hors de app/ → on ne touche pas
    const aliased = '#app/' + rel.replace(/\.js$/, '')
    return `${pre}${aliased}${post}`
  })
  if (out !== src) {
    writeFileSync(abs, out)
    console.log('rewrote', file)
  }
}
```

- [ ] **Step 2 : Exécuter le codemod**

Run: `cd backend && node scripts/normalize-imports.mjs`
Expected: liste des fichiers réécrits (~43).

- [ ] **Step 3 : Vérifier qu'il ne reste plus d'import remontant sous `app/`**

Run: `cd backend && grep -rn "from '\.\./" app --include=*.ts | grep -v "from '\./"`
Expected: aucune ligne.

- [ ] **Step 4 : Vérifier types + lint + tests (comportement inchangé)**

Run: `npm run typecheck && npm run lint && node ace test unit`
Expected: PASS. Les alias `#app/*` résolvent vers les mêmes fichiers que les chemins relatifs.

- [ ] **Step 5 : Ajouter la règle ESLint anti-régression**

Dans `backend/eslint.config.js`, ajouter un bloc de règles ciblant `app/**` (à insérer dans le tableau exporté, après le spread `configApp(...)`) :
```js
  {
    files: ['app/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Utiliser un alias (#app/..., #dogs/..., etc.) au lieu d’un import relatif remontant.',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 6 : Vérifier que la règle passe et supprimer le codemod**

Run: `cd backend && npm run lint && rm scripts/normalize-imports.mjs`
Expected: lint PASS, script supprimé.

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "refactor(imports): normalize relative parent imports to #app aliases + enforce via ESLint"
```

---

# LOT B — Cohérence structurelle

## Task 6 : `DomainError` porteur de `httpStatus`/`code` + handler générique + enveloppe unifiée

**Contexte vérifié :** `handler.ts` contient ~13 branches `instanceof` couplées à tous les modules, avec deux formes d'enveloppe (`{ message }` vs `{ error, message }`). `HttpError` porte déjà `status`/`code`/`details`. `DomainError` est vide. On rend `DomainError` auto-descriptif (défaut 400 / `DOMAIN_ERROR`), on annote les ~13 erreurs mappées, et on remplace l'échelle par un mapping générique. Enveloppe cible unique : `{ error: <code>, message: <message> }`.

**Files:**
- Modify: `backend/app/modules/share/exceptions/domain-error.ts`
- Modify: `backend/app/exceptions/handler.ts`
- Modify: 13 classes d'erreur (ajout de `httpStatus`/`code`)
- Create: `backend/tests/functional/errors/error-envelope.spec.ts`

**Interfaces:**
- Produces: `abstract class DomainError extends Error { readonly httpStatus: number; readonly code: string }` avec valeurs par défaut `400` / `'DOMAIN_ERROR'`.

- [ ] **Step 1 : Écrire un test fonctionnel d'enveloppe (échoue d'abord)**

> Prérequis : Task 9 (suite functional réparée + harnais d'auth). Si la Task 9 n'est pas encore faite, écrire ce test mais l'exécuter après la Task 9. Le harnais `authenticateAs` est défini en Task 9.

`backend/tests/functional/errors/error-envelope.spec.ts` :
```ts
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('Error envelope', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('unknown dog → 404 with { error, message }', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup)
    const response = await client
      .get('/api/v1/dogs/550e8400-e29b-41d4-a716-446655440000')
      .header('Authorization', auth.header)

    response.assertStatus(404)
    response.assertBodyContains({ error: 'ROBOT_DOG_NOT_FOUND' })
  })
})
```

- [ ] **Step 2 : Lancer → échoue (l'enveloppe actuelle de `RobotDogNotFoundError` est `{ message }` sans `error`)**

Run: `node ace test functional --files="error-envelope.spec.ts"`
Expected: FAIL (pas de champ `error`).

- [ ] **Step 3 : Enrichir `DomainError`**

`backend/app/modules/share/exceptions/domain-error.ts` :
```ts
export abstract class DomainError extends Error {
  readonly httpStatus: number = 400
  readonly code: string = 'DOMAIN_ERROR'

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
```

- [ ] **Step 4 : Annoter les 13 erreurs mappées par le handler**

Ajouter `readonly httpStatus = <n>` et `readonly code = '<CODE>'` en tête de classe (avant le constructeur) dans chaque fichier ci-dessous. Codes/status à préserver depuis le handler actuel :

| Fichier | httpStatus | code |
|---|---|---|
| `dogs/domain/exceptions/robot-dog-not-found.error.ts` | 404 | `ROBOT_DOG_NOT_FOUND` |
| `dogs/domain/exceptions/robot-dog-serial-number-already-exists.error.ts` | 409 | `ROBOT_DOG_SERIAL_NUMBER_ALREADY_EXISTS` (déjà fait Task 2) |
| `dogs/domain/exceptions/invalid-robot-dog-name.error.ts` | 422 | `INVALID_ROBOT_DOG_NAME` |
| `users/domain/exceptions/invalid-user-not-found.error.ts` | 404 | `USER_NOT_FOUND` |
| `users/ownerships/domain/exceptions/active-ownership-not-found.error.ts` | 404 | `ACTIVE_OWNERSHIP_NOT_FOUND` |
| `users/ownerships/domain/exceptions/ownership-already-exists.error.ts` | 409 | `OWNERSHIP_ALREADY_EXISTS` |
| `missions/domain/exceptions/mission-not-found.error.ts` | 404 | `MISSION_NOT_FOUND` (déjà fait Task 1) |
| `missions/domain/exceptions/invalid-mission-not-editable.error.ts` | 422 | `MISSION_NOT_EDITABLE` |
| `missions/domain/exceptions/invalid-mission-already-running.error.ts` | 409 | `MISSION_ALREADY_RUNNING` |
| `missions/domain/exceptions/invalid-mission-step-not-found.error.ts` | 404 | `MISSION_STEP_NOT_FOUND` |
| `actions/domain/exceptions/action-not-found.error.ts` | 404 | `ACTION_NOT_FOUND` |
| `actions/domain/exceptions/action-already-exists.error.ts` | 409 | `ACTION_ALREADY_EXISTS` |
| `robot-communication/domain/exceptions/invalid-robot-command.error.ts` | 422 | `INVALID_ROBOT_COMMAND` |

Exemple (`robot-dog-not-found.error.ts`) :
```ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'ROBOT_DOG_NOT_FOUND'

  constructor(id: string) {
    super(`RobotDog with id ${id} not found`)
  }
}
```

- [ ] **Step 5 : Remplacer l'échelle `instanceof` par un mapping générique**

`backend/app/exceptions/handler.ts` — remplacer tout le corps de `handle` par :
```ts
import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { DomainError } from '#app/modules/share/exceptions/domain-error'
import { HttpError } from '#app/modules/share/exceptions/http-error'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof HttpError) {
      return ctx.response.status(error.status).json({
        error: error.code,
        message: error.message,
        details: error.details,
      })
    }

    if (error instanceof DomainError) {
      return ctx.response.status(error.httpStatus).json({
        error: error.code,
        message: error.message,
      })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
```
> Toutes les branches et imports d'erreurs concrètes disparaissent. Les erreurs de domaine non annotées (validation VO, etc.) répondent désormais `400 { error: 'DOMAIN_ERROR', message }` (avant : `400 { message }`) — enveloppe homogénéisée.

- [ ] **Step 6 : Vérifier types, unit et le nouveau test d'enveloppe**

Run: `npm run typecheck && node ace test unit && node ace test functional --files="error-envelope.spec.ts"`
Expected: PASS. (Si un test unitaire de contrôleur assertait l'ancienne enveloppe `{ message }` sans `error`, l'ajuster vers `{ error, message }`.)

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "refactor(errors): make DomainError carry httpStatus/code, generic handler mapping, unified envelope"
```

---

## Task 7 : DRY repositories — helper `toPaginatedResult` + extraction du mapping des steps

**Contexte vérifié :** dans `mission.repository.implementation.ts`, le triptyque `paginate → map(rehydrate) → meta` est dupliqué 3× (`findAll`, `findByUser`, `listByRobotDog`) et le mapping `row.steps → MissionStep.rehydrate` est réécrit 4×. `PaginatedResult<T>` existe déjà (`#app/modules/share/DTO/paginated-result.dto`).

**Files:**
- Create: `backend/app/modules/share/infrastructure/database/to-paginated-result.ts`
- Create: `backend/tests/unit/share/to-paginated-result.spec.ts`
- Modify: `backend/app/modules/missions/infrastructure/database/repositories/mission.repository.implementation.ts`

**Interfaces:**
- Produces: `function toPaginatedResult<TRow, TDomain>(paginator, map): PaginatedResult<TDomain>` où `paginator` expose `all()`, `total`, `perPage`, `currentPage`, `firstPage`, `lastPage` (forme du `ModelPaginator` Lucid).

- [ ] **Step 1 : Écrire le test du helper (échoue d'abord)**

`backend/tests/unit/share/to-paginated-result.spec.ts` :
```ts
import { test } from '@japa/runner'
import { toPaginatedResult } from '#app/modules/share/infrastructure/database/to-paginated-result'

test.group('toPaginatedResult', () => {
  test('maps rows and builds meta', ({ assert }) => {
    const fakePaginator = {
      all: () => [{ n: 1 }, { n: 2 }],
      total: 2,
      perPage: 20,
      currentPage: 1,
      firstPage: 1,
      lastPage: 1,
    }

    const result = toPaginatedResult(fakePaginator, (row) => row.n * 10)

    assert.deepEqual(result.data, [10, 20])
    assert.deepEqual(result.meta, {
      total: 2,
      perPage: 20,
      currentPage: 1,
      firstPage: 1,
      lastPage: 1,
    })
  })
})
```

- [ ] **Step 2 : Lancer → échoue (module absent)**

Run: `node ace test unit --files="to-paginated-result.spec.ts"`
Expected: FAIL.

- [ ] **Step 3 : Implémenter le helper**

`backend/app/modules/share/infrastructure/database/to-paginated-result.ts` :
```ts
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

interface Paginated<TRow> {
  all(): TRow[]
  total: number
  perPage: number
  currentPage: number
  firstPage: number
  lastPage: number
}

export function toPaginatedResult<TRow, TDomain>(
  paginator: Paginated<TRow>,
  map: (row: TRow) => TDomain
): PaginatedResult<TDomain> {
  return {
    data: paginator.all().map(map),
    meta: {
      total: paginator.total,
      perPage: paginator.perPage,
      currentPage: paginator.currentPage,
      firstPage: paginator.firstPage,
      lastPage: paginator.lastPage,
    },
  }
}
```

- [ ] **Step 4 : Lancer → passe**

Run: `node ace test unit --files="to-paginated-result.spec.ts"`
Expected: PASS.

- [ ] **Step 5 : Refactorer `mission.repository.implementation.ts`**

Ajouter en tête `import { toPaginatedResult } from '#app/modules/share/infrastructure/database/to-paginated-result'`, puis introduire un helper privé de mapping des steps et l'utiliser partout :

```ts
private toSteps(row: MissionModel): MissionStep[] {
  return row.steps.map((s) =>
    MissionStep.rehydrate(s.id, s.actionId, s.sequenceOrder, s.parameters)
  )
}
```

Réécrire les 3 méthodes paginées en gardant **exactement** la sémantique de requête actuelle (mêmes `where`/`preload`/`orderBy`/bornes de page) :

```ts
async findAll(options?: PaginationDto): Promise<PaginatedResult<Mission>> {
  const page = Math.max(1, options?.page ?? 1)
  const limit = Math.min(options?.limit ?? 20, 100)

  const paginator = await MissionModel.query()
    .preload('steps', (q) => q.orderBy('sequence_order', 'asc'))
    .orderBy('created_at', 'desc')
    .paginate(page, limit)

  return toPaginatedResult(paginator, (row) =>
    Mission.rehydrate(row.id, row.name, row.userId, this.toSteps(row))
  )
}

async findByUser(userId: string, options?: PaginationDto): Promise<PaginatedResult<Mission>> {
  const page = Math.max(1, options?.page ?? 1)
  const limit = Math.min(options?.limit ?? 20, 100)

  const paginator = await MissionModel.query()
    .where('user_id', userId)
    .preload('steps', (q) => q.orderBy('sequence_order', 'asc'))
    .orderBy('created_at', 'desc')
    .paginate(page, limit)

  return toPaginatedResult(paginator, (row) =>
    Mission.rehydrate(row.id, row.name, row.userId, this.toSteps(row))
  )
}

async listByRobotDog(dogId: string, options?: PaginationDto): Promise<PaginatedResult<Mission>> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 10

  const paginator = await MissionModel.query()
    .whereHas('robotDogs', (q) => q.where('robot_dog_id', dogId))
    .preload('steps', (q) => q.orderBy('sequence_order', 'asc'))
    .preload('robotDogs')
    .paginate(page, limit)

  return toPaginatedResult(paginator, (row) =>
    Mission.rehydrate(
      row.id,
      row.name,
      row.userId,
      this.toSteps(row),
      row.robotDogs.map((dog) => RobotDogId.fromString(dog.id))
    )
  )
}
```
> `findById` peut aussi réutiliser `this.toSteps(row)` (optionnel). Ne pas changer les sémantiques de requête (`findAll`/`findByUser` ne préchargent toujours pas `robotDogs`).

- [ ] **Step 6 : Vérifier types + tests des repos/use-cases missions**

Run: `npm run typecheck && node ace test unit --files="mission"`
Expected: PASS.

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "refactor(missions): DRY pagination via shared toPaginatedResult + toSteps helper"
```

---

## Task 8 : Masquer `transmit` derrière un port `RealtimeBroadcaster` dans `NotificationService`

**Contexte vérifié :** `NotificationService` (application) importe directement `@adonisjs/transmit/services/main` (infra concrète) et fait un `as unknown as ...`. On introduit un port + un adaptateur, injectés via le container. **Les libellés FR restent** (extraction i18n → suivi frontend, hors périmètre).

**Files:**
- Create: `backend/app/modules/notifications/domain/contracts/realtime-broadcaster.ts`
- Create: `backend/app/modules/notifications/infrastructure/realtime/transmit-realtime-broadcaster.ts`
- Modify: `backend/app/modules/notifications/application/notification.service.ts`
- Modify: `backend/providers/notification_provider.ts`
- Modify: `backend/tests/unit/notifications/notification.service.spec.ts`

**Interfaces:**
- Produces: `abstract class RealtimeBroadcaster { abstract broadcast(channel: string, payload: Record<string, unknown>): void }`.

- [ ] **Step 1 : Lire le test existant pour connaître le double actuel**

Run: `sed -n '1,60p' backend/tests/unit/notifications/notification.service.spec.ts` (identifier comment le broadcast est aujourd'hui vérifié/mocké).

- [ ] **Step 2 : Définir le port**

`backend/app/modules/notifications/domain/contracts/realtime-broadcaster.ts` :
```ts
export abstract class RealtimeBroadcaster {
  abstract broadcast(channel: string, payload: Record<string, unknown>): void
}
```

- [ ] **Step 3 : Écrire/ajuster le test unitaire pour injecter un faux broadcaster (échoue d'abord)**

Dans `notification.service.spec.ts`, construire le service avec un faux broadcaster capturant les appels :
```ts
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'

class FakeBroadcaster extends RealtimeBroadcaster {
  public calls: { channel: string; payload: Record<string, unknown> }[] = []
  broadcast(channel: string, payload: Record<string, unknown>): void {
    this.calls.push({ channel, payload })
  }
}
```
Instancier `new NotificationService(repo, new FakeBroadcaster())` et asserter qu'un `create(...)` pousse un appel sur le canal `users/<userId>`.

Run: `node ace test unit --files="notification.service.spec.ts"`
Expected: FAIL (constructeur à 1 argument aujourd'hui).

- [ ] **Step 4 : Injecter le port dans `NotificationService`**

Dans `notification.service.ts` : supprimer `import transmit from '@adonisjs/transmit/services/main'`, ajouter le port au constructeur, et remplacer `broadcast()` :
```ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import type {
  NotificationRecord,
  Severity,
} from '#app/modules/notifications/domain/contracts/notification.repository'

// ...NotificationType inchangé...

@inject()
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly broadcaster: RealtimeBroadcaster
  ) {}

  // ...create / createBulk / buildMessage inchangés...

  private broadcast(notification: NotificationRecord): void {
    try {
      this.broadcaster.broadcast(`users/${notification.userId}`, {
        type: 'notification',
        notification: {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          severity: notification.severity,
          payload: notification.payload,
          robotDogId: notification.robotDogId,
          isRead: false as const,
          createdAt: notification.createdAt,
        },
      })
    } catch (error) {
      logger.error(
        { err: error, userId: notification.userId },
        'NotificationService: SSE broadcast failed'
      )
    }
  }
}
```

- [ ] **Step 5 : Implémenter l'adaptateur transmit**

`backend/app/modules/notifications/infrastructure/realtime/transmit-realtime-broadcaster.ts` :
```ts
import transmit from '@adonisjs/transmit/services/main'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'

export class TransmitRealtimeBroadcaster extends RealtimeBroadcaster {
  broadcast(channel: string, payload: Record<string, unknown>): void {
    transmit.broadcast(channel, payload as Parameters<typeof transmit.broadcast>[1])
  }
}
```

- [ ] **Step 6 : Câbler le binding dans le provider**

Dans `backend/providers/notification_provider.ts`, lier le port à l'adaptateur (suivre le style des autres `container.bind(...)` du fichier) :
```ts
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { TransmitRealtimeBroadcaster } from '#app/modules/notifications/infrastructure/realtime/transmit-realtime-broadcaster'
// dans register():
this.app.container.bind(RealtimeBroadcaster, () => new TransmitRealtimeBroadcaster())
```

- [ ] **Step 7 : Vérifier types + tests + lint**

Run: `npm run typecheck && node ace test unit --files="notification" && npm run lint`
Expected: PASS. (Plus aucun `as unknown as` ni import direct de `transmit` dans la couche application.)

- [ ] **Step 8 : Commit**

```bash
git add -A && git commit -m "refactor(notifications): hide transmit behind RealtimeBroadcaster port"
```

---

# LOT C — Infrastructure de test & intégrité

## Task 9 : Réparer le suite de tests fonctionnels (glob cassé + harnais d'auth Firebase)

**Contexte vérifié :**
1. `adonisrc.ts` : le suite `functional` glob `tests/unit/**` (bug) → les tests de `tests/functional/**` **ne s'exécutent jamais**.
2. Une fois le glob corrigé, les tests fonctionnels existants **échouent** : `create-robot-dog.spec.ts` poste **sans token** (route derrière `firebaseAuth()`), et `index-user-auth.spec.ts` mocke le verifier mais **oublie `email_verified: true`** et ne **seed aucun user** (le middleware fait `findByFirebaseUid`).
3. Le pattern de mock est déjà connu : `app.container.swap(FirebaseTokenVerifier, …)` + `cleanup(() => app.container.restore(...))`.

On corrige le glob **et** on fournit un harnais réutilisable, puis on répare les tests fonctionnels existants pour rendre le suite vert.

**Files:**
- Modify: `backend/adonisrc.ts`
- Create: `backend/tests/functional/helpers/auth.ts`
- Modify: `backend/tests/functional/dogs/infrastructure/http/*.spec.ts` (5 fichiers)
- Modify: `backend/tests/functional/users/infrastructure/http/index-user-auth.spec.ts`

**Interfaces:**
- Produces: `authenticateAs(cleanup, opts?): Promise<{ header: string; user: UserModel }>` — seed un user, swap le `FirebaseTokenVerifier`, restaure au cleanup, renvoie l'en-tête `Authorization` à utiliser.

- [ ] **Step 1 : Corriger le glob du suite functional**

Dans `backend/adonisrc.ts`, le second suite :
```ts
{
  files: ['tests/functional/**/*.spec.{ts,js}'],
  name: 'functional',
  timeout: 30000,
},
```

- [ ] **Step 2 : Écrire le harnais d'auth**

`backend/tests/functional/helpers/auth.ts` :
```ts
import app from '@adonisjs/core/services/app'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import UserModel from '#users/infrastructure/database/models/user'
import { UserRole } from '#users/domain/enums/user.role'

class FakeFirebaseTokenVerifier extends FirebaseTokenVerifier {
  constructor(private readonly uid: string) {
    super()
  }

  async handle(): Promise<DecodedIdToken> {
    const now = Math.floor(Date.now() / 1000)
    return {
      uid: this.uid,
      sub: this.uid,
      aud: 'doggo-test',
      auth_time: now,
      iat: now,
      exp: now + 3600,
      iss: 'https://securetoken.google.com/doggo-test',
      email: `${this.uid}@example.com`,
      email_verified: true,
      firebase: { identities: {}, sign_in_provider: 'password' },
    } as DecodedIdToken
  }
}

interface AuthOptions {
  firebaseUid?: string
  role?: UserRole
  token?: string
}

/**
 * Seed un utilisateur, remplace le vérificateur Firebase par un faux qui valide
 * n'importe quel token pour cet uid, et restaure au cleanup. Renvoie l'en-tête à poser.
 */
export async function authenticateAs(
  cleanup: (fn: () => void) => void,
  opts: AuthOptions = {}
): Promise<{ header: string; user: UserModel }> {
  const firebaseUid = opts.firebaseUid ?? 'firebase-uid-test'
  const token = opts.token ?? 'valid-id-token'

  const user = await UserModel.create({
    firebaseUid,
    firstname: 'Test',
    lastname: 'User',
    email: `${firebaseUid}@example.com`,
    role: opts.role ?? UserRole.USER,
  })

  app.container.swap(FirebaseTokenVerifier, () => new FakeFirebaseTokenVerifier(firebaseUid))
  cleanup(() => app.container.restore(FirebaseTokenVerifier))

  return { header: `Bearer ${token}`, user }
}
```
> Vérifier la valeur exacte de l'enum : `grep -n "" app/modules/users/domain/enums/user.role.ts`. Utiliser le membre « utilisateur standard » (probablement `UserRole.USER`).

- [ ] **Step 3 : Réparer `create-robot-dog.spec.ts` (et les 4 autres tests dogs) avec l'en-tête d'auth**

Exemple pour `create-robot-dog.spec.ts` :
```ts
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('POST /api/v1/dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new robot dog', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup)

    const response = await client
      .post('/api/v1/dogs')
      .header('Authorization', auth.header)
      .json({ serialNumber: 'SN-HTTP-001', name: 'TestHTTP', batteryLevel: 90 })

    response.assertStatus(201)
    response.assertBodyContains({ message: 'RobotDog created' })
  })
})
```
Appliquer le même patron (`authenticateAs(cleanup)` + `.header('Authorization', auth.header)`) aux specs `show-`, `index-`, `update-`, `destroy-robot-dog.spec.ts`.

- [ ] **Step 4 : Réparer `index-user-auth.spec.ts`**

Ajouter `email_verified: true` dans le token du faux verifier **et** seed un user avec `uid: 'firebase-uid-1'` avant l'appel (ou remplacer par `authenticateAs`). Le test « 401 sans token » reste inchangé.

- [ ] **Step 5 : Lancer le suite functional complet**

Run: `node ace test functional`
Expected: PASS (tous les tests dogs + users verts). Prérequis d'infra : Postgres de test accessible (voir `docker-compose.yml`) et migrations à jour (`node ace migration:run`).

- [ ] **Step 6 : Commit**

```bash
git add -A && git commit -m "test(functional): fix suite glob + Firebase auth test harness, repair existing functional specs"
```

---

## Task 10 : Fermer la course TOCTOU — index unique partiel « un run actif par robot » + mapping de la violation

**Contexte vérifié :** la garde « un seul run actif par chien » est purement applicative (`findActiveRunByRobotDog` puis `save`). Aucune contrainte base. `MissionRunRepositoryImplementation.save` fait `MissionRunModel.updateOrCreate({ id }, …)` → un nouveau run est un INSERT. Un index unique partiel `WHERE status IN ('PENDING','RUNNING')` fera lever une violation Postgres (code `23505`) sur le second INSERT concurrent ; on la convertit en `InvalidMissionAlreadyRunningError`.

**Files:**
- Create: `backend/database/migrations/<timestamp>_add_unique_active_run_per_dog_index.ts`
- Modify: `backend/app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts`
- Create: `backend/tests/functional/missions/one-active-run-per-dog.spec.ts`

- [ ] **Step 1 : Créer la migration**

Générer un fichier horodaté :
```bash
cd backend && node ace make:migration add_unique_active_run_per_dog_index
```
Remplacer son contenu par un index partiel (SQL brut, car Knex ne gère pas nativement les index partiels multi-valeurs) :
```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
      CREATE UNIQUE INDEX one_active_run_per_dog
      ON mission_runs (robot_dog_id)
      WHERE status IN ('PENDING', 'RUNNING')
    `)
  }

  async down() {
    this.schema.raw(`DROP INDEX IF EXISTS one_active_run_per_dog`)
  }
}
```

- [ ] **Step 2 : Appliquer la migration**

Run: `node ace migration:run`
Expected: migration `...add_unique_active_run_per_dog_index` appliquée.

- [ ] **Step 3 : Écrire le test d'intégration (échoue d'abord)**

`backend/tests/functional/missions/one-active-run-per-dog.spec.ts` — teste la contrainte **au niveau repository** (contourne le court-circuit applicatif du use-case) :
```ts
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'

test.group('mission_runs unique active constraint', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a second active run for the same dog is rejected', async ({ assert }) => {
    const repo = new MissionRunRepositoryImplementation()

    // Pré-requis : une mission et un chien existent (FK). Adapter la création aux
    // modèles réels (colonnes obligatoires). Exemple minimal :
    const dog = await RobotDogModel.create({ /* champs requis : serialNumber, name, ... */ } as any)
    const missionA = await MissionModel.create({ name: 'A', userId: 'user-1' } as any)
    const missionB = await MissionModel.create({ name: 'B', userId: 'user-1' } as any)

    const run1 = MissionRun.start(missionA.id as any, dog.id as any, [])
    await repo.save(run1)

    const run2 = MissionRun.start(missionB.id as any, dog.id as any, [])
    await assert.rejects(() => repo.save(run2), InvalidMissionAlreadyRunningError)
  })
})
```
> Ajuster la création `dog`/`mission` aux colonnes réelles (`grep -n "@column" app/modules/dogs/infrastructure/database/models/robot-dog.ts`). L'important : deux runs **actifs** (PENDING) sur le **même** `robot_dog_id`.

- [ ] **Step 4 : Lancer → échoue (la 2e sauvegarde lève une erreur Postgres brute, pas `InvalidMissionAlreadyRunningError`)**

Run: `node ace test functional --files="one-active-run-per-dog.spec.ts"`
Expected: FAIL (erreur `23505` non mappée).

- [ ] **Step 5 : Mapper la violation dans le repository**

Dans `mission-run.repository.implementation.ts`, entourer le `db.transaction(...)` de `save` et convertir l'erreur d'unicité :
```ts
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'

// ...
async save(run: MissionRun): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // ...corps inchangé...
    })
  } catch (error) {
    if (this.isUniqueActiveRunViolation(error)) {
      throw new InvalidMissionAlreadyRunningError()
    }
    throw error
  }
}

private isUniqueActiveRunViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505' &&
    'constraint' in error &&
    (error as { constraint?: string }).constraint === 'one_active_run_per_dog'
  )
}
```
> Le check applicatif du use-case (`findActiveRunByRobotDog`) reste comme court-circuit rapide ; la base devient l'arbitre. La compensation du use-case (`markLaunchFailed` → status terminal) reste un UPDATE de la même ligne → pas de violation. `confirm()` (PENDING→RUNNING, même ligne) reste actif → pas de violation.

- [ ] **Step 6 : Lancer → passe**

Run: `node ace test functional --files="one-active-run-per-dog.spec.ts"`
Expected: PASS.

- [ ] **Step 7 : Non-régression du use-case start-mission**

Run: `npm run typecheck && node ace test unit --files="start-mission.spec.ts"`
Expected: PASS.

- [ ] **Step 8 : Commit**

```bash
git add -A && git commit -m "fix(missions): DB-enforced single active run per dog (partial unique index) + map 23505 to domain error"
```

---

# LOT D — Sécurisation du canal MQTT (critique)

## Task 11 : Valider les payloads robot entrants (remplacer les casts `as` par des schémas Vine)

**Contexte vérifié :** dans `mqtt.service.implementation.ts`, `handleTelemetry`/`handleMissionUpdate`/`handleStateChanged` font `JSON.parse(raw) as RobotTelemetry | RobotMissionUpdate | { state }` — la forme n'est jamais vérifiée. Vine est déjà la lib de validation du projet (aucune nouvelle dépendance). On valide chaque message avant de le passer au use-case ; un message malformé est **logué puis ignoré** (le comportement `try/catch` de rejet existant est conservé/étendu).

**Files:**
- Create: `backend/app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator.ts`
- Create: `backend/app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator.ts`
- Create: `backend/app/modules/robot-communication/infrastructure/mqtt/validators/robot-state.validator.ts`
- Create: `backend/tests/unit/robot-communication/mqtt-payload-validators.spec.ts`
- Modify: `backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`

**Interfaces:**
- Produces: `robotTelemetryValidator`, `robotMissionUpdateValidator`, `robotStateValidator` (Vine compilés) validant respectivement `{ battery, state? }`, `{ missionId, stepId, status }`, `{ state }`.

- [ ] **Step 1 : Écrire le test des validateurs (échoue d'abord)**

`backend/tests/unit/robot-communication/mqtt-payload-validators.spec.ts` :
```ts
import { test } from '@japa/runner'
import { robotTelemetryValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator'
import { robotMissionUpdateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

test.group('MQTT payload validators', () => {
  test('accepts a valid telemetry payload', async ({ assert }) => {
    const out = await robotTelemetryValidator.validate({ battery: 80 })
    assert.equal(out.battery, 80)
  })

  test('rejects telemetry with non-numeric battery', async ({ assert }) => {
    await assert.rejects(() => robotTelemetryValidator.validate({ battery: 'full' }))
  })

  test('rejects mission update with missing stepId', async ({ assert }) => {
    await assert.rejects(() =>
      robotMissionUpdateValidator.validate({
        missionId: '550e8400-e29b-41d4-a716-446655440000',
        status: MissionStepStatus.COMPLETED,
      })
    )
  })
})
```

- [ ] **Step 2 : Lancer → échoue (modules absents)**

Run: `node ace test unit --files="mqtt-payload-validators.spec.ts"`
Expected: FAIL.

- [ ] **Step 3 : Écrire les validateurs**

`robot-telemetry.validator.ts` :
```ts
import vine from '@vinejs/vine'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export const robotTelemetryValidator = vine.compile(
  vine.object({
    battery: vine.number().min(0).max(100),
    state: vine.enum(Object.values(RobotDogState)).optional(),
  })
)
```
`robot-mission-update.validator.ts` :
```ts
import vine from '@vinejs/vine'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'

export const robotMissionUpdateValidator = vine.compile(
  vine.object({
    missionId: vine.string().uuid(),
    stepId: vine.string().uuid(),
    status: vine.enum(Object.values(MissionStepStatus)),
  })
)
```
`robot-state.validator.ts` :
```ts
import vine from '@vinejs/vine'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

export const robotStateValidator = vine.compile(
  vine.object({
    state: vine.enum(Object.values(RobotDogState)),
  })
)
```
> Vérifier au préalable la forme des enums : `grep -n "" app/modules/dogs/domain/enums/robot-dog.state.ts app/modules/missions/domain/enums/mission-step-status.ts`. `vine.enum(Object.values(Enum))` accepte les valeurs de l'enum.

- [ ] **Step 4 : Lancer → passe**

Run: `node ace test unit --files="mqtt-payload-validators.spec.ts"`
Expected: PASS.

- [ ] **Step 5 : Brancher les validateurs dans le service MQTT**

Dans `mqtt.service.implementation.ts`, remplacer les casts par une validation. Chaque handler parse le JSON, valide, et **ignore proprement** (log warn) si invalide :
```ts
import { robotTelemetryValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator'
import { robotMissionUpdateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator'
import { robotStateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-state.validator'

private async handleTelemetry(dogId: string, raw: string): Promise<void> {
  let telemetry: RobotTelemetry
  try {
    telemetry = await robotTelemetryValidator.validate(JSON.parse(raw))
  } catch {
    logger.warn({ dogId, raw }, 'MqttService: invalid telemetry payload')
    return
  }
  const useCase = await app.container.make(HandleRobotTelemetryUseCase)
  await useCase.execute(dogId, telemetry)
}

private async handleMissionUpdate(dogId: string, raw: string): Promise<void> {
  let update: RobotMissionUpdate
  try {
    update = await robotMissionUpdateValidator.validate(JSON.parse(raw))
  } catch {
    logger.warn({ dogId, raw }, 'MqttService: invalid mission update payload')
    return
  }
  const useCase = await app.container.make(HandleRobotMissionUpdateUseCase)
  await useCase.execute(dogId, update)
}

private async handleStateChanged(dogId: string, raw: string): Promise<void> {
  let payload: { state: string }
  try {
    payload = await robotStateValidator.validate(JSON.parse(raw))
  } catch {
    logger.warn({ dogId, raw }, 'MqttService: invalid state payload')
    return
  }
  const useCase = await app.container.make(HandleRobotStateChangedUseCase)
  await useCase.execute(dogId, payload.state)
}
```
> `JSON.parse` lève sur JSON malformé → capturé par le même `catch`. Le `validate` typé aligne la sortie sur `RobotTelemetry`/`RobotMissionUpdate` (vérifier compat de types ; sinon caster la sortie validée vers le type de domaine, la forme étant désormais garantie).

- [ ] **Step 6 : Vérifier types + tests**

Run: `npm run typecheck && node ace test unit --files="robot-communication"`
Expected: PASS.

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "security(mqtt): validate inbound robot payloads with Vine instead of unchecked casts"
```

---

## Task 12 : Durcir le broker MQTT (auth + TLS + ACL) et connecter le backend en `mqtts://`

**Contexte vérifié :** `mosquitto.conf` = `allow_anonymous true`, listener 1883, pas de TLS. Le backend se connecte en `mqtt://` sans creds (`mqtt_provider.ts` → `mqtt.service.implementation.ts`). `env.ts` ne prévoit ni identifiants ni CA. On ajoute l'auth + ACL + TLS côté broker, les creds/TLS côté env, et le protocole `mqtts` côté service.

> **Proportionnalité (rappel audit) :** acceptable sur réseau labo isolé. Cette tâche est **impérative avant tout déploiement où le broker est joignable au-delà de l'hôte**. La partie génération de certificats / mots de passe est **manuelle/ops** et sa vérification est une étape d'intégration (pas un test unitaire CI).

**Files:**
- Modify: `backend/start/env.ts`
- Modify: `backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`
- Modify: `backend/mosquitto/mosquitto.conf`
- Create: `backend/mosquitto/aclfile`
- Modify: `backend/docker-compose.yml`
- Modify: `backend/.env.example`

- [ ] **Step 1 : Étendre le schéma env (optionnel pour ne pas casser le dev existant)**

Dans `backend/start/env.ts`, sous le bloc MQTT :
```ts
  MQTT_HOST: Env.schema.string(),
  MQTT_PORT: Env.schema.number(),
  MQTT_USERNAME: Env.schema.string.optional(),
  MQTT_PASSWORD: Env.schema.string.optional(),
  MQTT_USE_TLS: Env.schema.boolean.optional(),
  MQTT_CA_PATH: Env.schema.string.optional(),
```

- [ ] **Step 2 : Connexion backend paramétrable (protocole + creds + CA)**

Dans `mqtt.service.implementation.ts`, `connect()` :
```ts
import { readFileSync } from 'node:fs'
// ...
async connect(): Promise<void> {
  const host = env.get('MQTT_HOST')
  const port = env.get('MQTT_PORT')
  const useTls = env.get('MQTT_USE_TLS', false)
  const protocol = useTls ? 'mqtts' : 'mqtt'
  const caPath = env.get('MQTT_CA_PATH')

  this.client = await mqtt.connectAsync(`${protocol}://${host}:${port}`, {
    clientId: `doggo-backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    username: env.get('MQTT_USERNAME'),
    password: env.get('MQTT_PASSWORD'),
    ...(useTls && caPath ? { ca: readFileSync(caPath) } : {}),
  })

  logger.info({ host, port, tls: useTls }, 'MqttService: connected to broker')
  // ...subscriptions + handlers inchangés...
}
```

- [ ] **Step 3 : Vérifier que le backend compile et démarre encore en dev (mode non-TLS)**

Run: `npm run typecheck`
Expected: PASS. En dev, `MQTT_USE_TLS=false`, `MQTT_USERNAME/PASSWORD` vides → connexion `mqtt://` (identique à avant si le broker accepte encore, cf. étape suivante pour l'utilisateur dev).

- [ ] **Step 4 : Config broker — auth + ACL par topic**

`backend/mosquitto/mosquitto.conf` :
```conf
# Listener non chiffré (réseau interne / dev uniquement)
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwordfile
acl_file /mosquitto/config/aclfile

# Listener TLS (production)
listener 8883
protocol mqtt
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
require_certificate false

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
```
`backend/mosquitto/aclfile` (le backend a tous les droits ; chaque robot est cloisonné à son sous-arbre `robot/<id>/#`) :
```conf
# Compte backend : accès complet
user doggo-backend
topic readwrite robot/#

# Gabarit par robot (dupliquer/générer par robot ; %u = username = id du robot)
pattern readwrite robot/%u/#
```

- [ ] **Step 5 : docker-compose — monter password/acl/certs et exposer 8883**

Dans `backend/docker-compose.yml`, service `mosquitto` :
```yaml
  mosquitto:
    image: eclipse-mosquitto:2
    container_name: robot_dog_mqtt
    restart: unless-stopped
    ports:
      - '1883:1883'
      - '8883:8883'
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./mosquitto/passwordfile:/mosquitto/config/passwordfile
      - ./mosquitto/aclfile:/mosquitto/config/aclfile
      - ./mosquitto/certs:/mosquitto/certs
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
```

- [ ] **Step 6 : Générer les identifiants et (pour la prod) les certificats — étape ops manuelle**

Créer le fichier de mots de passe (compte backend + un compte par robot) :
```bash
cd backend
touch mosquitto/passwordfile
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b /m/passwordfile doggo-backend '<mot-de-passe-backend>'
docker run --rm -v "$PWD/mosquitto:/m" eclipse-mosquitto:2 \
  mosquitto_passwd -b /m/passwordfile '<robot-id>' '<mot-de-passe-robot>'
```
Pour la prod (TLS), déposer `ca.crt`/`server.crt`/`server.key` dans `backend/mosquitto/certs/`. **Ne pas committer** secrets/certs : ajouter au `.gitignore` :
```
mosquitto/passwordfile
mosquitto/certs/
```

- [ ] **Step 7 : Renseigner `.env` / `.env.example`**

Compléter (dans `.env.example`, valeurs vides ; en local, `.env` avec les vraies) :
```dotenv
MQTT_USERNAME=doggo-backend
MQTT_PASSWORD=
MQTT_USE_TLS=false
MQTT_CA_PATH=
```
Pour un déploiement TLS : `MQTT_PORT=8883`, `MQTT_USE_TLS=true`, `MQTT_CA_PATH=/chemin/ca.crt`.

- [ ] **Step 8 : Vérification d'intégration (manuelle)**

```bash
cd backend && docker compose up -d mosquitto
docker logs robot_dog_mqtt --tail 20   # doit démarrer sans erreur, listeners 1883 + 8883
# publication anonyme rejetée :
docker run --rm -it --network host eclipse-mosquitto:2 \
  mosquitto_pub -h 127.0.0.1 -p 1883 -t 'robot/x/command' -m '{}' ; echo "exit=$?"  # doit échouer (auth)
# avec creds backend : OK
docker run --rm -it --network host eclipse-mosquitto:2 \
  mosquitto_pub -h 127.0.0.1 -p 1883 -u doggo-backend -P '<pwd>' -t 'robot/x/command' -m '{}' ; echo "exit=$?"
```
Puis démarrer le backend (`npm run dev`) avec `MQTT_USERNAME/PASSWORD` renseignés → log `MqttService: connected to broker`.
Expected: publication anonyme refusée, backend connecté avec creds.

- [ ] **Step 9 : Commit**

```bash
git add -A && git commit -m "security(mqtt): authenticated broker (password + ACL) + TLS listener + mqtts backend connection"
```

---

## Self-Review (couverture de l'audit — backend)

| Constat audit | Sévérité | Tâche(s) |
|---|---|---|
| Canal MQTT ouvert (auth/TLS + validation payloads) | 🔴 | 11 (validation) + 12 (broker/TLS) |
| Course TOCTOU lancement mission | 🟠 | 10 |
| CORS permissif | 🟠 | 4 |
| Handler exceptions OCP + enveloppe incohérente | 🟠 | 6 |
| DRY repositories (pagination + mapping) | 🟡 | 7 |
| Lacunes tests fonctionnels HTTP | 🟡 | 9 (infra + réparation) + 10 (intégration) |
| Code mort / doublons / noms fautés | 🟢 | 1, 2 |
| Imports incohérents (relatifs vs alias) | 🟢 | 5 |
| `.env.example` désynchronisé | 🟢 | 3 |
| Fuite couche/i18n `NotificationService` | 🟢 | 8 (port ; i18n différée — cf. Périmètre) |

**Constats frontend** (Pinia, `useLogin`, token localStorage, garde route admin) : **hors périmètre** (backend uniquement), à traiter dans un lot ultérieur.

**Ordonnancement conseillé :** A (1→5) puis B (6→8) puis C (9→10) puis D (11→12). La Task 9 (suite functional réparé + harnais d'auth) est un **prérequis** pour exécuter les tests fonctionnels des Tasks 6 et 10 — si vous exécutez B avant C, écrire les tests fonctionnels mais différer leur run jusqu'après la Task 9.
