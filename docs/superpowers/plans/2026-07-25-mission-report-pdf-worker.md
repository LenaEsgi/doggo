# Rapport PDF de mission via Worker Rust isolé — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À la fin d'une mission (SUCCESS/FAILED), déclencher de façon asynchrone la génération d'un rapport PDF par un Worker Rust totalement isolé du Backend, communiquant via deux queues RabbitMQ dédiées, stockant le résultat sur GCS et notifiant l'utilisateur via le pipeline existant.

**Architecture:** `MissionCompletedEvent` (enrichi d'un `missionRunId`) déclenche un listener qui construit un payload autoportant et le publie sur la queue AMQP `mission-report.requests`. Un Worker Rust indépendant (aucun accès DB/modèles) consomme ce message, génère le PDF, l'upload sur GCS, et publie une réponse (succès ou échec, toujours une des deux) sur `mission-report.responses`. Le Backend consomme cette réponse, met à jour une table `mission_reports`, et notifie l'utilisateur via le `NotificationService` existant. Le téléchargement se fait via une URL signée GCS générée à la demande.

**Tech Stack:** AdonisJS 6 (TypeScript), `amqplib` (Node AMQP), `@google-cloud/storage` (Node), RabbitMQ (nouveau conteneur), Rust + `lapin` (AMQP) + `printpdf` (PDF) + `google-cloud-storage` crate (GCS), Postgres/Lucid pour la nouvelle table `mission_reports`.

## État d'avancement (2026-07-25, à lire par tout agent qui reprend ce plan)

**Les 16 tâches sont terminées, committées, revues clean sur la branche `feat/mission-report-pdf-worker` (non pushée).** Le workspace SDD (`.superpowers/sdd/2026-07-25-mission-report-pdf-worker/`) a été supprimé après la review finale clean — l'historique git est la référence désormais.

Commits (du plus ancien au plus récent) : `97970f6`..`170bee2` (26 commits, voir `git log --oneline 97970f6~1..HEAD`).

**Review finale de branche (eec20a1..52db13e) et fix wave (52db13e..170bee2) :** la review finale a trouvé 3 Critical + plusieurs Important/Minor. Sur décision utilisateur, seuls les 3 Critical + 1 Important (`failure_reason` varchar(255) → text) ont été corrigés dans un unique fix wave, plus un 5ᵉ bug trouvé indépendamment par le contrôleur (`npx tsc --noEmit` cassé project-wide suite à l'ajout de `findById` en Task 5, corrigé sur `FakeMissionRunRepository`). Re-review du fix wave : clean, tout ADDRESSED, aucune régression Critical/Important.

**Dette documentée, non corrigée dans cette branche (décision utilisateur, périmètre du fix wave limité) :**
- Pas de réconciliation pour les rapports bloqués en PENDING (plusieurs chemins possibles : publish qui échoue, sendToQueue sans confirm channel, JSON invalide côté worker, publish_response qui échoue après retries).
- Un panic dans le rendu PDF (Rust) plante le process avant d'ack le message → boucle de crash possible sur le même message.
- Le service `worker` dans `docker-compose.yml` n'est pas optionnel (`profiles:`) et `GCS_BUCKET_NAME` y est codé en dur au lieu d'être interpolé depuis `.env`.
- Aucun test de contrat pin le format JSON exact des deux côtés de la queue (Node↔Rust).
- Le consumer de réponses ne valide pas le shape du message reçu avant de l'utiliser.

Ces points restent dans les Issues de la review finale (texte perdu avec la suppression du workspace, mais résumé ci-dessus) — à traiter dans une tâche/branche séparée si besoin.

**Décisions humaines actées pendant l'exécution (à respecter, ne pas relitiger) :**
- Task 7 : cast `run.status as 'SUCCESS'|'FAILED'` (builder.ts) gardé tel quel — les Global Constraints garantissent déjà que le trigger ne fire que pour SUCCESS/FAILED.
- Task 9 : notifications `report_ready`/`report_failed` enrichies avec le vrai nom de mission (lookup MissionRun→Mission ajouté au use case, hors périmètre initial du brief) ; `channel.nack` du consumer sécurisé par son propre try/catch.
- Task 10 : endpoint de téléchargement — use case restructuré (`findReadyReport`/`getSignedUrl` séparés) pour garantir l'autorisation AVANT tout appel GCS ; test 403 "non-propriétaire" ajouté ; garde `MissionReportStorageMisconfiguredError` ajoutée si `GCS_BUCKET_NAME` absent. Test happy-path (READY→200+URL) toujours manquant, bloqué sur credentials GCS réelles (Task 16).
- Task 11 : `worker/assets/.gitkeep` ajouté (placeholder) pour que le Dockerfile ne casse pas sur `COPY assets`.
- Task 12 : police DejaVu Sans récupérée depuis l'archive de release officielle (l'URL raw/master du plan est en 404) — même projet upstream, fichier vérifié valide. Test de génération PDF gardé tel quel (vérifie juste les magic bytes `%PDF`, pas le contenu réel) — décision utilisateur, pas de renforcement.
- Task 15 (boucle principale du worker) : `publish_response` enveloppé dans `retry::with_backoff` (au lieu d'un simple log-and-ack) pour ne pas perdre silencieusement la garantie "toujours répondre" ; `delivery.ack`/`nack` ne font plus planter tout le process sur un échec transitoire (log-and-continue au lieu de `?`). Gardés tels quels (décision utilisateur) : le cas JSON invalide ne publie jamais de réponse (impossible de corréler sans missionRunId), et `RETRY_DELAYS = [5s, 30s]` reste 2 constantes codées en dur (pas une vraie formule exponentielle).

**Task 16 (Ops — GCP + docker-compose) : partie agent terminée.** `worker/.gitignore`, service `worker` dans `docker-compose.yml`, et `deploy/mission-report-worker/README.md` (procédure GCP manuelle) sont faits et committés.

**Il reste uniquement la partie humaine, obligatoire, non faisable par un agent (Steps 1-3 et 6 du plan) :** création du bucket GCS réel (`doggo-mission-reports`, projet `doggo-502614`) et des 2 service-accounts IAM (écriture Worker / lecture-signature Backend) via la console GCP, génération des clés JSON — ce sont des changements sur de l'infra cloud réelle et des credentials de sécurité. Puis le round-trip final (`docker compose up -d --build`, déclencher une mission réelle, vérifier `docker compose logs worker`) nécessite ces credentials réels et doit être vérifié par l'utilisateur. Voir `deploy/mission-report-worker/README.md` pour la procédure exacte.

**Le plan est terminé côté agent.** Toutes les tâches (1-16) sont faites, revues, et la review finale de branche est clean après fix wave. Il ne reste que la vérification manuelle GCP ci-dessus avant que la feature soit pleinement opérationnelle en environnement réel.

---

## Global Constraints

- Le Worker Rust ne doit avoir **aucun accès** à la base de données Postgres du Backend, ni à ses modèles Lucid. Il reçoit toutes les données nécessaires dans le message de requête AMQP.
- Le Worker ne doit **jamais** appeler le Backend de manière synchrone (pas de HTTP call retour). Toute communication passe par les deux queues (`mission-report.requests`, `mission-report.responses`).
- Le Worker répond **toujours** — succès ou échec — sur `mission-report.responses`. Jamais de message de requête sans réponse correspondante.
- Le Worker est responsable de sa propre politique de retry (backoff exponentiel avant échec définitif), pas seulement d'un simple nack.
- Un rapport raté ne doit jamais faire échouer le traitement métier de la mission elle-même (soft-fail systématique côté Backend sur les erreurs liées au rapport).
- Périmètre du déclencheur : uniquement les statuts `SUCCESS` et `FAILED` de `MissionRun` (via `MissionCompletedEvent`) — `INTERRUPTED`/`LAUNCH_FAILED` sont explicitement hors périmètre de ce plan (voir le spec, section "Hors périmètre").
- Ne jamais lancer `node ace test` sans `--files=` ou `--suite=unit`/`--suite=functional` (a fait planter la machine par le passé sur ce projet — toujours cibler précisément).
- Ne jamais `git push` sans demande explicite de l'utilisateur ; committer sur la branche `feat/mission-report-pdf-worker` existante après chaque tâche.

---

## Task 1: Infra — RabbitMQ + configuration d'environnement

**Files:**
- Modify: `docker-compose.yml`
- Modify: `start/env.ts`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `.env.test`
- Modify: `.env.ci.test`

**Interfaces:**
- Produces: variables d'env `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST` consommées par les tâches suivantes via `env.get(...)`.

- [ ] **Step 1: Ajouter le service RabbitMQ à `docker-compose.yml`**

Ajouter ce service à côté de `postgres`/`mosquitto`/`redis` :

```yaml
  rabbitmq:
    image: rabbitmq:4-management-alpine
    container_name: robot_dog_rabbitmq
    restart: unless-stopped
    ports:
      - '5672:5672'
      - '15672:15672'
    environment:
      RABBITMQ_DEFAULT_USER: doggo
      RABBITMQ_DEFAULT_PASS: doggo_password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ['CMD', 'rabbitmq-diagnostics', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
```

Et ajouter `rabbitmq_data:` à la section `volumes:` en fin de fichier (à côté de `postgres_data`, `mosquitto_data`, etc.).

- [ ] **Step 2: Démarrer le conteneur et vérifier qu'il tourne**

Run: `docker compose up -d rabbitmq`
Expected: `docker compose ps rabbitmq` affiche `healthy` sous 30s.

- [ ] **Step 3: Déclarer les nouvelles variables d'environnement dans `start/env.ts`**

Ajouter, juste après le bloc `REDIS_*` existant :

```ts
  /*
  |----------------------------------------------------------
  | Variables for configuring RabbitMQ (mission report queue)
  |----------------------------------------------------------
  */
  RABBITMQ_HOST: Env.schema.string({ format: 'host' }),
  RABBITMQ_PORT: Env.schema.number(),
  RABBITMQ_USERNAME: Env.schema.string(),
  RABBITMQ_PASSWORD: Env.schema.string.optional(),
  RABBITMQ_VHOST: Env.schema.string.optional(),
```

- [ ] **Step 4: Ajouter les valeurs dans `.env`, `.env.example`, `.env.test`, `.env.ci.test`**

Dans `.env` et `.env.example` (à côté du bloc `REDIS_*`) :

```
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=doggo
RABBITMQ_PASSWORD=doggo_password
RABBITMQ_VHOST=
```

Dans `.env.test` (même bloc, mais **sans lancer RabbitMQ pendant les tests** — voir Task 8 pour le guard d'environnement) :

```
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=doggo
RABBITMQ_PASSWORD=doggo_password
```

Dans `.env.ci.test` :

```
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=doggo
RABBITMQ_PASSWORD=doggo_password
```

- [ ] **Step 5: Vérifier que le boot de l'app ne casse pas**

Run: `node ace env:validate` (ou simplement `node ace serve --hmr` puis `Ctrl+C` une fois démarré)
Expected: aucune erreur de validation de schéma d'env.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml start/env.ts .env.example .env.test .env.ci.test
git commit -m "chore: ajoute RabbitMQ pour le pont Backend<->Worker rapport PDF"
```

Note : `.env` local n'est pas commité (gitignored) — vérifier avec `git status` qu'il n'apparaît pas dans les fichiers stagés.

---

## Task 2: Domain — MissionReport (entité, value object, enum, contrat de repository)

**Files:**
- Create: `app/modules/missions/domain/value-objects/mission-report-id.ts`
- Create: `app/modules/missions/domain/exceptions/invalid-mission-report-id.error.ts`
- Create: `app/modules/missions/domain/enums/mission-report-status.ts`
- Create: `app/modules/missions/domain/entities/mission-report.entity.ts`
- Create: `app/modules/missions/domain/contracts/mission-report.repository.ts`
- Test: `tests/unit/missions/mission-report.entity.spec.ts`

**Interfaces:**
- Produces: `MissionReport` (méthodes `create`, `rehydrate`, `markReady(gcsObjectPath: string)`, `markFailed(reason: string)`, getters `id`, `missionRunId`, `robotDogId`, `status`, `gcsObjectPath`, `failureReason`, `requestedAt`, `completedAt`), `MissionReportStatus` enum, `MissionReportRepository` (contrat abstrait) — consommés par Task 3 (persistance), Task 8 (listener), Task 9 (consumer), Task 11 (endpoint).

- [ ] **Step 1: Écrire le test de l'entité (fail attendu : fichiers inexistants)**

```ts
// tests/unit/missions/mission-report.entity.spec.ts
import { test } from '@japa/runner'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

test.group('MissionReport entity', () => {
  test('create() démarre en PENDING sans chemin GCS ni raison d\'échec', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    assert.equal(report.status, MissionReportStatus.PENDING)
    assert.equal(report.missionRunId, 'run-1')
    assert.equal(report.robotDogId, 'dog-1')
    assert.isNull(report.gcsObjectPath)
    assert.isNull(report.failureReason)
    assert.isNull(report.completedAt)
  })

  test('markReady() passe en READY et enregistre le chemin GCS + completedAt', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    report.markReady('mission-reports/run-1.pdf')

    assert.equal(report.status, MissionReportStatus.READY)
    assert.equal(report.gcsObjectPath, 'mission-reports/run-1.pdf')
    assert.isNotNull(report.completedAt)
  })

  test('markFailed() passe en FAILED et enregistre la raison + completedAt', ({ assert }) => {
    const report = MissionReport.create('run-1', 'dog-1')

    report.markFailed('gcs upload timeout')

    assert.equal(report.status, MissionReportStatus.FAILED)
    assert.equal(report.failureReason, 'gcs upload timeout')
    assert.isNotNull(report.completedAt)
  })
})
```

- [ ] **Step 2: Run pour vérifier l'échec**

Run: `node ace test --files=tests/unit/missions/mission-report.entity.spec.ts`
Expected: FAIL — `Cannot find module '#app/modules/missions/domain/entities/mission-report.entity'`

- [ ] **Step 3: Créer le value object `MissionReportId`**

```ts
// app/modules/missions/domain/value-objects/mission-report-id.ts
import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionReportIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-report-id.error'

export class MissionReportId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionReportId {
    return new MissionReportId(this.generateUuid())
  }

  public static fromString(value: string): MissionReportId {
    try {
      this.validate(value)
      return new MissionReportId(value)
    } catch {
      throw new InvalidMissionReportIdError(value)
    }
  }
}
```

```ts
// app/modules/missions/domain/exceptions/invalid-mission-report-id.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionReportIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid MissionReportId: ${value}`)
  }
}
```

- [ ] **Step 4: Créer l'enum de statut**

```ts
// app/modules/missions/domain/enums/mission-report-status.ts
export enum MissionReportStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}
```

- [ ] **Step 5: Créer l'entité `MissionReport`**

```ts
// app/modules/missions/domain/entities/mission-report.entity.ts
import { MissionReportId } from '#app/modules/missions/domain/value-objects/mission-report-id'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

export default class MissionReport {
  private constructor(
    private readonly _id: MissionReportId,
    private readonly _missionRunId: string,
    private readonly _robotDogId: string,
    private _status: MissionReportStatus,
    private _gcsObjectPath: string | null,
    private _failureReason: string | null,
    private readonly _requestedAt: Date,
    private _completedAt: Date | null
  ) {}

  static create(missionRunId: string, robotDogId: string): MissionReport {
    return new MissionReport(
      MissionReportId.generate(),
      missionRunId,
      robotDogId,
      MissionReportStatus.PENDING,
      null,
      null,
      new Date(),
      null
    )
  }

  static rehydrate(
    id: string,
    missionRunId: string,
    robotDogId: string,
    status: MissionReportStatus,
    gcsObjectPath: string | null,
    failureReason: string | null,
    requestedAt: Date,
    completedAt: Date | null
  ): MissionReport {
    return new MissionReport(
      MissionReportId.fromString(id),
      missionRunId,
      robotDogId,
      status,
      gcsObjectPath,
      failureReason,
      requestedAt,
      completedAt
    )
  }

  markReady(gcsObjectPath: string): void {
    this._status = MissionReportStatus.READY
    this._gcsObjectPath = gcsObjectPath
    this._completedAt = new Date()
  }

  markFailed(reason: string): void {
    this._status = MissionReportStatus.FAILED
    this._failureReason = reason
    this._completedAt = new Date()
  }

  get id(): MissionReportId {
    return this._id
  }

  get missionRunId(): string {
    return this._missionRunId
  }

  get robotDogId(): string {
    return this._robotDogId
  }

  get status(): MissionReportStatus {
    return this._status
  }

  get gcsObjectPath(): string | null {
    return this._gcsObjectPath
  }

  get failureReason(): string | null {
    return this._failureReason
  }

  get requestedAt(): Date {
    return this._requestedAt
  }

  get completedAt(): Date | null {
    return this._completedAt
  }
}
```

- [ ] **Step 6: Créer le contrat de repository**

```ts
// app/modules/missions/domain/contracts/mission-report.repository.ts
import type MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

export abstract class MissionReportRepository {
  abstract save(report: MissionReport): Promise<void>
  abstract findByMissionRunId(missionRunId: string): Promise<MissionReport | null>
}
```

- [ ] **Step 7: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/unit/missions/mission-report.entity.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add app/modules/missions/domain/value-objects/mission-report-id.ts \
        app/modules/missions/domain/exceptions/invalid-mission-report-id.error.ts \
        app/modules/missions/domain/enums/mission-report-status.ts \
        app/modules/missions/domain/entities/mission-report.entity.ts \
        app/modules/missions/domain/contracts/mission-report.repository.ts \
        tests/unit/missions/mission-report.entity.spec.ts
git commit -m "feat: entité domaine MissionReport (statut PENDING/READY/FAILED)"
```

---

## Task 3: Persistance — migration, modèle Lucid, repository, binding DI

**Files:**
- Create: `database/migrations/<timestamp>_create_mission_reports_table.ts`
- Create: `app/modules/missions/infrastructure/database/models/mission-report.ts`
- Create: `app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation.ts`
- Modify: `providers/mission_provider.ts`
- Test: `tests/functional/missions/mission-report-repository.spec.ts`

**Interfaces:**
- Consumes: `MissionReport` entity, `MissionReportStatus` enum (Task 2)
- Produces: `MissionReportRepositoryImplementation implements MissionReportRepository` bindable via `app.container.make(MissionReportRepository)` — consommé par Task 8/9/11.

- [ ] **Step 1: Créer la migration**

Le nom du fichier doit utiliser un timestamp supérieur au dernier existant (`1784900000000_create_robot_dogs_serial_seq.ts`) — utiliser par exemple `1785000000000_create_mission_reports_table.ts`.

```ts
// database/migrations/1785000000000_create_mission_reports_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_reports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('mission_run_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('mission_runs')
        .onDelete('CASCADE')
      table
        .uuid('robot_dog_id')
        .notNullable()
        .references('id')
        .inTable('robot_dogs')
        .onDelete('CASCADE')
      table.string('status').notNullable()
      table.string('gcs_object_path').nullable()
      table.string('failure_reason').nullable()
      table.timestamp('requested_at').notNullable()
      table.timestamp('completed_at').nullable()

      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 2: Lancer la migration**

Run: `node ace migration:run`
Expected: `Migrated database in Xms` sans erreur, table `mission_reports` visible en base.

- [ ] **Step 3: Créer le modèle Lucid**

```ts
// app/modules/missions/infrastructure/database/models/mission-report.ts
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'

export default class MissionReportModel extends BaseModel {
  public static table = 'mission_reports'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare missionRunId: string

  @column()
  declare robotDogId: string

  @column()
  declare status: MissionReportStatus

  @column()
  declare gcsObjectPath: string | null

  @column()
  declare failureReason: string | null

  @column.dateTime()
  declare requestedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

- [ ] **Step 4: Créer l'implémentation du repository**

```ts
// app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation.ts
import { DateTime } from 'luxon'
import { type MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import MissionReportModel from '#app/modules/missions/infrastructure/database/models/mission-report'

export class MissionReportRepositoryImplementation implements MissionReportRepository {
  async save(report: MissionReport): Promise<void> {
    await MissionReportModel.updateOrCreate(
      { id: report.id.value },
      {
        missionRunId: report.missionRunId,
        robotDogId: report.robotDogId,
        status: report.status,
        gcsObjectPath: report.gcsObjectPath,
        failureReason: report.failureReason,
        requestedAt: DateTime.fromJSDate(report.requestedAt),
        completedAt: report.completedAt ? DateTime.fromJSDate(report.completedAt) : null,
      }
    )
  }

  async findByMissionRunId(missionRunId: string): Promise<MissionReport | null> {
    const row = await MissionReportModel.query().where('mission_run_id', missionRunId).first()

    return row ? this.toDomain(row) : null
  }

  private toDomain(row: MissionReportModel): MissionReport {
    return MissionReport.rehydrate(
      row.id,
      row.missionRunId,
      row.robotDogId,
      row.status,
      row.gcsObjectPath,
      row.failureReason,
      row.requestedAt.toJSDate(),
      row.completedAt ? row.completedAt.toJSDate() : null
    )
  }
}
```

- [ ] **Step 5: Binder dans `MissionProvider`**

Ajouter l'import et le binding dans `providers/mission_provider.ts` :

```ts
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation'
```

Et dans `register()`, à la suite des autres `this.app.container.bind(...)` :

```ts
    this.app.container.bind(MissionReportRepository, () => {
      return this.app.container.make(MissionReportRepositoryImplementation)
    })
```

- [ ] **Step 6: Écrire le test fonctionnel (fail attendu tant que le repo n'est pas branché — ici il passera directement, donc l'écrire puis vérifier qu'il passe)**

```ts
// tests/functional/missions/mission-report-repository.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { MissionReportRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation'

test.group('MissionReportRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('save() puis findByMissionRunId() retrouve un rapport READY', async ({ assert }) => {
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-REPORT-001',
      key: 'ReportTestDogKeyAAA1',
      name: 'ReportDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    const mission = await MissionModel.create({ id: randomUUID(), name: 'Patrouille', userId: randomUUID() })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: new (await import('luxon')).DateTime.now(),
      endedAt: new (await import('luxon')).DateTime.now(),
    })

    const repository = new MissionReportRepositoryImplementation()
    const report = MissionReport.create(run.id, dog.id)
    report.markReady('mission-reports/some-path.pdf')
    await repository.save(report)

    const found = await repository.findByMissionRunId(run.id)

    assert.isNotNull(found)
    assert.equal(found?.status, 'READY')
    assert.equal(found?.gcsObjectPath, 'mission-reports/some-path.pdf')
  })
})
```

- [ ] **Step 7: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/functional/missions/mission-report-repository.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add database/migrations/1785000000000_create_mission_reports_table.ts \
        app/modules/missions/infrastructure/database/models/mission-report.ts \
        app/modules/missions/infrastructure/database/repositories/mission-report.repository.implementation.ts \
        providers/mission_provider.ts \
        tests/functional/missions/mission-report-repository.spec.ts
git commit -m "feat: persistance mission_reports (migration, modèle, repository)"
```

---

## Task 4: Domain — enrichir `MissionCompletedEvent` avec `missionRunId`

**Files:**
- Modify: `app/modules/missions/domain/events/mission-completed.event.ts`
- Modify: `app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case.ts:95`
- Modify: `tests/unit/notifications/mission-completed-sse.listener.spec.ts` (si existant — sinon vérifier tout autre test qui construit `MissionCompletedEvent`)

**Interfaces:**
- Produces: `MissionCompletedEvent` avec un 5ᵉ paramètre `missionRunId: string` (avant `robotDogId, status` conservés) — consommé par Task 8.

- [ ] **Step 1: Chercher tous les usages de `new MissionCompletedEvent(` pour lister les call sites à mettre à jour**

Run: `grep -rn "new MissionCompletedEvent(\|MissionCompletedEvent.dispatch(" app tests`
Expected: exactement 1 site de dispatch (`handle-robot-mission-update.use-case.ts:95`) + tout test qui instancie l'event directement (à vérifier et adapter un par un).

- [ ] **Step 2: Ajouter `missionRunId` au constructeur de l'event**

```ts
// app/modules/missions/domain/events/mission-completed.event.ts
import { BaseEvent } from '@adonisjs/core/events'
import { type MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export default class MissionCompletedEvent extends BaseEvent {
  constructor(
    public readonly missionId: string,
    public readonly missionName: string,
    public readonly missionRunId: string,
    public readonly robotDogId: string,
    public readonly status: MissionRunStatus
  ) {
    super()
  }
}
```

- [ ] **Step 3: Mettre à jour le seul call site**

Dans `handle-robot-mission-update.use-case.ts`, le `run` (variable locale du `uow.run(...)`) porte déjà `run.id.value`. Modifier la ligne 95 :

```ts
        void MissionCompletedEvent.dispatch(
          update.missionId,
          mission.name,
          run.id.value,
          dogId,
          outcome.runStatus
        )
```

Note : `run` est déclaré dans la closure passée à `this.uow.run(...)` plus haut dans la méthode et n'est pas directement accessible après le `await this.uow.run(...)` — vérifier dans le fichier actuel si `outcome` doit être étendu pour porter `runId`. Si `run` n'est plus dans le scope à cet endroit, ajouter `runId: run.id.value` à l'objet retourné par la closure (`return { runStatus: run.status, transitioned, terminal: run.isTerminal, runId: run.id.value }`) et utiliser `outcome.runId` au lieu de `run.id.value` dans le dispatch.

- [ ] **Step 4: Corriger tout test existant qui construit `MissionCompletedEvent` directement**

Chercher et adapter chaque `new MissionCompletedEvent(...)` trouvé au Step 1 en insérant un `missionRunId` factice (ex. `'run-1'`) au bon endroit dans les arguments positionnels.

- [ ] **Step 5: Vérifier que rien ne casse côté handle-robot-mission-update**

Run: `node ace test --files=tests/unit/robot-communication/handle-robot-mission-update.use-case.spec.ts` (adapter le chemin exact au fichier trouvé via `find tests -iname "*handle-robot-mission-update*"`)
Expected: PASS

- [ ] **Step 6: Vérifier le typecheck global (cet event est largement référencé)**

Run: `node ace test --files=tests/unit/notifications/mission-completed-sse.listener.spec.ts` (si ce fichier existe — sinon lister via `find tests -iname "*mission-completed*"`)
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/modules/missions/domain/events/mission-completed.event.ts \
        app/modules/robot-communication/application/use-cases/handle-robot-mission-update.use-case.ts
git commit -m "feat: propage missionRunId dans MissionCompletedEvent"
```

---

## Task 5: Domain — `findById` sur `MissionRunRepository`

**Files:**
- Modify: `app/modules/missions/domain/contracts/mission-run.repository.ts`
- Modify: `app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts`
- Test: `tests/functional/missions/mission-run-find-by-id.spec.ts`

**Interfaces:**
- Produces: `MissionRunRepository.findById(missionRunId: string): Promise<MissionRun | null>` — consommé par Task 7 (payload builder), sans restriction de statut (contrairement à `findActiveRun*`).

- [ ] **Step 1: Écrire le test fonctionnel (fail attendu : méthode inexistante)**

```ts
// tests/functional/missions/mission-run-find-by-id.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'

test.group('MissionRunRepositoryImplementation.findById', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('retrouve un run même terminal (SUCCESS), avec ses steps', async ({ assert }) => {
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-FINDBYID-001',
      key: 'FindByIdDogKeyAAA111',
      name: 'FindByIdDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    const mission = await MissionModel.create({ id: randomUUID(), name: 'Patrouille', userId: randomUUID() })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: DateTime.now(),
      endedAt: DateTime.now(),
    })

    const repository = new MissionRunRepositoryImplementation()
    const found = await repository.findById(run.id)

    assert.isNotNull(found)
    assert.equal(found?.status, MissionRunStatus.SUCCESS)
    assert.equal(found?.id.value, run.id)
  })

  test('retourne null si le run n\'existe pas', async ({ assert }) => {
    const repository = new MissionRunRepositoryImplementation()
    const found = await repository.findById(randomUUID())
    assert.isNull(found)
  })
})
```

- [ ] **Step 2: Run pour vérifier l'échec**

Run: `node ace test --files=tests/functional/missions/mission-run-find-by-id.spec.ts`
Expected: FAIL — `repository.findById is not a function`

- [ ] **Step 3: Ajouter la méthode au contrat**

Dans `app/modules/missions/domain/contracts/mission-run.repository.ts`, ajouter :

```ts
  abstract findById(missionRunId: string): Promise<MissionRun | null>
```

- [ ] **Step 4: Implémenter la méthode**

Dans `app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts`, ajouter (à côté de `hasActiveRunForMission`) :

```ts
  async findById(missionRunId: string): Promise<MissionRun | null> {
    const row = await MissionRunModel.query()
      .where('id', missionRunId)
      .preload('runSteps')
      .first()

    return row ? this.toDomain(row) : null
  }
```

- [ ] **Step 5: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/functional/missions/mission-run-find-by-id.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add app/modules/missions/domain/contracts/mission-run.repository.ts \
        app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation.ts \
        tests/functional/missions/mission-run-find-by-id.spec.ts
git commit -m "feat: MissionRunRepository.findById (runs terminaux inclus)"
```

---

## Task 6: Infra — connexion RabbitMQ partagée (publisher + helper consumer)

**Files:**
- Create: `app/modules/share/infrastructure/queue/rabbitmq-connection.ts`
- Create: `app/modules/missions/domain/contracts/mission-report-request-publisher.ts`
- Create: `app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher.ts`
- Test: `tests/unit/missions/rabbitmq-mission-report-request-publisher.spec.ts`

**Interfaces:**
- Consumes: `amqplib` (nouvelle dépendance npm)
- Produces: `RabbitMqConnection.getChannel(config): Promise<Channel>` (singleton mémoïsé, y compris sur échec) ; `MissionReportRequestPublisher.publish(payload: MissionReportRequestPayload): Promise<void>` — consommé par Task 8. `MissionReportRequestPayload` type exporté depuis ce fichier, réutilisé par Task 7/8.

- [ ] **Step 1: Installer `amqplib` et ses types**

Run: `npm install amqplib && npm install --save-dev @types/amqplib`
Expected: `amqplib` et `@types/amqplib` ajoutés à `package.json`.

- [ ] **Step 2: Créer le helper de connexion partagé**

```ts
// app/modules/share/infrastructure/queue/rabbitmq-connection.ts
import amqplib, { type Channel, type ChannelModel } from 'amqplib'

export type RabbitMqConfig = {
  hostname: string
  port: number
  username: string
  password?: string
  vhost?: string
}

export class RabbitMqConnection {
  private static channelPromise: Promise<Channel> | null = null

  static async getChannel(config: RabbitMqConfig): Promise<Channel> {
    if (!this.channelPromise) {
      this.channelPromise = this.connect(config)
    }
    return this.channelPromise
  }

  private static async connect(config: RabbitMqConfig): Promise<Channel> {
    const connection: ChannelModel = await amqplib.connect({
      protocol: 'amqp',
      hostname: config.hostname,
      port: config.port,
      username: config.username,
      password: config.password,
      vhost: config.vhost || '/',
    })
    return connection.createChannel()
  }
}
```

- [ ] **Step 3: Créer le contrat de publisher (domaine)**

```ts
// app/modules/missions/domain/contracts/mission-report-request-publisher.ts
export type MissionReportRequestStep = {
  name: string
  status: string
  order: number
}

export type MissionReportRequestPayload = {
  missionRunId: string
  missionName: string
  robotDogName: string
  status: 'SUCCESS' | 'FAILED'
  startedAt: string
  endedAt: string | null
  steps: MissionReportRequestStep[]
}

export abstract class MissionReportRequestPublisher {
  abstract publish(payload: MissionReportRequestPayload): Promise<void>
}
```

- [ ] **Step 4: Écrire le test du publisher (fail attendu : fichier inexistant)**

```ts
// tests/unit/missions/rabbitmq-mission-report-request-publisher.spec.ts
import { test } from '@japa/runner'
import { RabbitMqMissionReportRequestPublisher } from '#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher'

test.group('RabbitMqMissionReportRequestPublisher', () => {
  test('publish() envoie sur la queue mission-report.requests via basic_publish', async ({ assert }) => {
    const published: { queue: string; content: Buffer; persistent?: boolean }[] = []
    const fakeChannel = {
      assertQueue: async () => {},
      sendToQueue: (queue: string, content: Buffer, options: { persistent?: boolean }) => {
        published.push({ queue, content, persistent: options.persistent })
        return true
      },
    }

    const publisher = new RabbitMqMissionReportRequestPublisher(async () => fakeChannel as never)

    await publisher.publish({
      missionRunId: 'run-1',
      missionName: 'Patrouille',
      robotDogName: 'Rex',
      status: 'SUCCESS',
      startedAt: '2026-07-25T10:00:00.000Z',
      endedAt: '2026-07-25T10:15:00.000Z',
      steps: [{ name: 'Avancer', status: 'COMPLETED', order: 1 }],
    })

    assert.lengthOf(published, 1)
    assert.equal(published[0].queue, 'mission-report.requests')
    assert.isTrue(published[0].persistent)
    const parsed = JSON.parse(published[0].content.toString('utf8'))
    assert.equal(parsed.missionRunId, 'run-1')
    assert.equal(parsed.steps[0].name, 'Avancer')
  })
})
```

- [ ] **Step 5: Run pour vérifier l'échec**

Run: `node ace test --files=tests/unit/missions/rabbitmq-mission-report-request-publisher.spec.ts`
Expected: FAIL — module inexistant

- [ ] **Step 6: Implémenter le publisher, avec un canal injectable pour le test**

```ts
// app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher.ts
import type { Channel } from 'amqplib'
import env from '#start/env'
import {
  MissionReportRequestPublisher,
  type MissionReportRequestPayload,
} from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import { RabbitMqConnection } from '#app/modules/share/infrastructure/queue/rabbitmq-connection'

export const MISSION_REPORT_REQUESTS_QUEUE = 'mission-report.requests'

type ChannelFactory = () => Promise<Channel>

const defaultChannelFactory: ChannelFactory = () =>
  RabbitMqConnection.getChannel({
    hostname: env.get('RABBITMQ_HOST'),
    port: env.get('RABBITMQ_PORT'),
    username: env.get('RABBITMQ_USERNAME'),
    password: env.get('RABBITMQ_PASSWORD'),
    vhost: env.get('RABBITMQ_VHOST'),
  })

export class RabbitMqMissionReportRequestPublisher implements MissionReportRequestPublisher {
  constructor(private readonly getChannel: ChannelFactory = defaultChannelFactory) {}

  async publish(payload: MissionReportRequestPayload): Promise<void> {
    const channel = await this.getChannel()
    await channel.assertQueue(MISSION_REPORT_REQUESTS_QUEUE, { durable: true })
    channel.sendToQueue(MISSION_REPORT_REQUESTS_QUEUE, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    })
  }
}
```

- [ ] **Step 7: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/unit/missions/rabbitmq-mission-report-request-publisher.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json \
        app/modules/share/infrastructure/queue/rabbitmq-connection.ts \
        app/modules/missions/domain/contracts/mission-report-request-publisher.ts \
        app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher.ts \
        tests/unit/missions/rabbitmq-mission-report-request-publisher.spec.ts
git commit -m "feat: publisher RabbitMQ pour la queue mission-report.requests"
```

---

## Task 7: Application — construction du payload de rapport (cross-module)

**Files:**
- Create: `app/modules/missions/application/services/mission-report-payload.builder.ts`
- Test: `tests/unit/missions/mission-report-payload.builder.spec.ts`

**Interfaces:**
- Consumes: `MissionRunRepository.findById` (Task 5), `MissionRepository.findById`, `RobotDogGateway.findBy`, `ActionRepository.findById` (tous déjà existants sauf le premier)
- Produces: `MissionReportPayloadBuilder.build(missionRunId: string, missionName: string): Promise<MissionReportRequestPayload | null>` — consommé par Task 8. Retourne `null` si le run ou la mission n'existent plus (cas limite, log en amont par l'appelant).

- [ ] **Step 1: Écrire le test avec des fakes de repository/gateway (fail attendu : fichier inexistant)**

```ts
// tests/unit/missions/mission-report-payload.builder.spec.ts
import { test } from '@japa/runner'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'

const noop = () => {
  throw new Error('not implemented in fake')
}

test.group('MissionReportPayloadBuilder', () => {
  test('assemble un payload complet avec le nom du robot et des steps résolus', async ({ assert }) => {
    const action = Action.create('WALK_FORWARD', 'Avancer', 'walk-forward', null)
    const missionStep = MissionStep.create(action.id.value, 1, '{}')

    const mission = Mission.rehydrate('mission-1', 'Patrouille', 'user-1', [missionStep])

    const runStep = MissionRunStep.rehydrate('runstep-1', missionStep.id.value, MissionStepStatus.COMPLETED, 1)
    const run = MissionRun.rehydrate(
      'run-1',
      'mission-1',
      'dog-1',
      MissionRunStatus.SUCCESS,
      [runStep],
      new Date('2026-07-25T10:00:00.000Z'),
      new Date('2026-07-25T10:15:00.000Z')
    )

    const missionRunRepository: MissionRunRepository = {
      listActiveRuns: noop,
      findActiveRun: noop,
      findActiveRunForUpdate: noop,
      findActiveRunByRobotDog: noop,
      findActiveRunByRobotDogForUpdate: noop,
      hasActiveRunForMission: noop,
      save: noop,
      findById: async () => run,
    }

    const missionRepository: MissionRepository = {
      findById: async () => mission,
    } as unknown as MissionRepository

    const robotDogGateway: RobotDogGateway = {
      findBy: async () =>
        RobotDog.rehydrate('dog-1', 'SN-1', 'ROBOTDOGKEY000001', 'Rex', RobotDogState.IDLE, 80, new Date()),
    } as unknown as RobotDogGateway

    const actionRepository: ActionRepository = {
      findById: async () => action,
      findByCode: noop,
      index: noop,
      save: noop,
      delete: noop,
    }

    const builder = new MissionReportPayloadBuilder(
      missionRunRepository,
      missionRepository,
      robotDogGateway,
      actionRepository
    )

    const payload = await builder.build('run-1', 'Patrouille')

    assert.isNotNull(payload)
    assert.equal(payload?.missionRunId, 'run-1')
    assert.equal(payload?.robotDogName, 'Rex')
    assert.equal(payload?.status, 'SUCCESS')
    assert.equal(payload?.startedAt, '2026-07-25T10:00:00.000Z')
    assert.equal(payload?.endedAt, '2026-07-25T10:15:00.000Z')
    assert.lengthOf(payload?.steps ?? [], 1)
    assert.equal(payload?.steps[0].name, 'Avancer')
    assert.equal(payload?.steps[0].status, 'COMPLETED')
  })

  test('retourne null si le run n\'existe plus', async ({ assert }) => {
    const missionRunRepository: MissionRunRepository = {
      listActiveRuns: noop,
      findActiveRun: noop,
      findActiveRunForUpdate: noop,
      findActiveRunByRobotDog: noop,
      findActiveRunByRobotDogForUpdate: noop,
      hasActiveRunForMission: noop,
      save: noop,
      findById: async () => null,
    }

    const builder = new MissionReportPayloadBuilder(
      missionRunRepository,
      {} as MissionRepository,
      {} as RobotDogGateway,
      {} as ActionRepository
    )

    const payload = await builder.build('run-404', 'Patrouille')
    assert.isNull(payload)
  })
})
```

Vérifier au préalable la signature réelle de `RobotDog.rehydrate` (`grep -n "static rehydrate" app/modules/dogs/domain/robot-dog.entity.ts`) et ajuster l'ordre des arguments du test si elle diffère de celle utilisée ci-dessus.

- [ ] **Step 2: Run pour vérifier l'échec**

Run: `node ace test --files=tests/unit/missions/mission-report-payload.builder.spec.ts`
Expected: FAIL — module inexistant

- [ ] **Step 3: Implémenter le builder**

```ts
// app/modules/missions/application/services/mission-report-payload.builder.ts
import { inject } from '@adonisjs/core'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { type MissionReportRequestPayload } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'

@inject()
export class MissionReportPayloadBuilder {
  constructor(
    private readonly missionRunRepository: MissionRunRepository,
    private readonly missionRepository: MissionRepository,
    private readonly robotDogGateway: RobotDogGateway,
    private readonly actionRepository: ActionRepository
  ) {}

  async build(missionRunId: string, missionName: string): Promise<MissionReportRequestPayload | null> {
    const run = await this.missionRunRepository.findById(missionRunId)
    if (!run) return null

    const mission = await this.missionRepository.findById(MissionId.fromString(run.missionId.value))
    if (!mission) return null

    const dog = await this.robotDogGateway.findBy(RobotDogId.fromString(run.robotDogId.value))

    const steps = await Promise.all(
      run.runSteps
        .sort((a, b) => a.order - b.order)
        .map(async (runStep) => {
          const missionStep = mission.missionSteps.find((s) => s.id.equals(runStep.stepId))
          const action = missionStep
            ? await this.actionRepository.findById(ActionId.fromString(missionStep.actionId))
            : null

          return {
            name: action?.name ?? 'Étape inconnue',
            status: runStep.status,
            order: runStep.order,
          }
        })
    )

    return {
      missionRunId: run.id.value,
      missionName,
      robotDogName: dog?.name ?? 'Robot',
      status: run.status as 'SUCCESS' | 'FAILED',
      startedAt: run.startedAt.toISOString(),
      endedAt: run.endedAt ? run.endedAt.toISOString() : null,
      steps,
    }
  }
}
```

Note : `MissionStep.actionId` est un getter public déjà existant (`get actionId()`) — vérifier qu'il expose bien la valeur `string` brute (pas un `ActionId`) avant d'appeler `ActionId.fromString`.

- [ ] **Step 4: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/unit/missions/mission-report-payload.builder.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/modules/missions/application/services/mission-report-payload.builder.ts \
        tests/unit/missions/mission-report-payload.builder.spec.ts
git commit -m "feat: MissionReportPayloadBuilder assemble le payload cross-module du rapport"
```

---

## Task 8: Application — `MissionReportRequestListener` + enregistrement

**Files:**
- Create: `app/modules/missions/application/listeners/mission-report-request.listener.ts`
- Modify: `start/events.ts`
- Modify: `providers/mission_provider.ts` (binder `MissionReportRequestPublisher`)
- Test: `tests/unit/missions/mission-report-request.listener.spec.ts`

**Interfaces:**
- Consumes: `MissionReportPayloadBuilder.build` (Task 7), `MissionReportRequestPublisher.publish` (Task 6), `MissionReportRepository.save` (Task 3), `MissionCompletedEvent` (Task 4)
- Produces: écoute `MissionCompletedEvent` et déclenche la chaîne payload → save PENDING → publish. Erreurs avalées en soft-fail (log uniquement), jamais propagées.

- [ ] **Step 1: Écrire le test du listener (fail attendu : fichier inexistant)**

```ts
// tests/unit/missions/mission-report-request.listener.spec.ts
import { test } from '@japa/runner'
import MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import MissionReportRequestListener from '#app/modules/missions/application/listeners/mission-report-request.listener'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'

class FakeMissionReportRepository extends MissionReportRepository {
  readonly saved: MissionReport[] = []
  async save(report: MissionReport): Promise<void> {
    this.saved.push(report)
  }
  async findByMissionRunId(): Promise<MissionReport | null> {
    return null
  }
}

class FakePublisher extends MissionReportRequestPublisher {
  readonly published: unknown[] = []
  async publish(payload: unknown): Promise<void> {
    this.published.push(payload)
  }
}

class FailingPublisher extends MissionReportRequestPublisher {
  async publish(): Promise<void> {
    throw new Error('RabbitMQ down')
  }
}

test.group('MissionReportRequestListener', () => {
  test('sauvegarde un rapport PENDING puis publie la requête sur la queue', async ({ assert }) => {
    const reportRepository = new FakeMissionReportRepository()
    const publisher = new FakePublisher()
    const builder = {
      build: async () => ({
        missionRunId: 'run-1',
        missionName: 'Patrouille',
        robotDogName: 'Rex',
        status: 'SUCCESS' as const,
        startedAt: '2026-07-25T10:00:00.000Z',
        endedAt: '2026-07-25T10:15:00.000Z',
        steps: [],
      }),
    } as unknown as MissionReportPayloadBuilder

    const listener = new MissionReportRequestListener(builder, reportRepository, publisher)
    const event = new MissionCompletedEvent('mission-1', 'Patrouille', 'run-1', 'dog-1', MissionRunStatus.SUCCESS)

    await listener.handle(event)

    assert.lengthOf(reportRepository.saved, 1)
    assert.equal(reportRepository.saved[0].missionRunId, 'run-1')
    assert.equal(reportRepository.saved[0].status, 'PENDING')
    assert.lengthOf(publisher.published, 1)
  })

  test('avale silencieusement une erreur de publication (soft-fail)', async ({ assert }) => {
    const reportRepository = new FakeMissionReportRepository()
    const publisher = new FailingPublisher()
    const builder = {
      build: async () => ({
        missionRunId: 'run-1',
        missionName: 'Patrouille',
        robotDogName: 'Rex',
        status: 'SUCCESS' as const,
        startedAt: '2026-07-25T10:00:00.000Z',
        endedAt: null,
        steps: [],
      }),
    } as unknown as MissionReportPayloadBuilder

    const listener = new MissionReportRequestListener(builder, reportRepository, publisher)
    const event = new MissionCompletedEvent('mission-1', 'Patrouille', 'run-1', 'dog-1', MissionRunStatus.SUCCESS)

    await assert.doesNotReject(() => listener.handle(event))
  })
})
```

- [ ] **Step 2: Run pour vérifier l'échec**

Run: `node ace test --files=tests/unit/missions/mission-report-request.listener.spec.ts`
Expected: FAIL — module inexistant

- [ ] **Step 3: Implémenter le listener**

```ts
// app/modules/missions/application/listeners/mission-report-request.listener.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type MissionCompletedEvent from '#app/modules/missions/domain/events/mission-completed.event'
import { MissionReportPayloadBuilder } from '#app/modules/missions/application/services/mission-report-payload.builder'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

@inject()
export default class MissionReportRequestListener {
  constructor(
    private readonly payloadBuilder: MissionReportPayloadBuilder,
    private readonly reportRepository: MissionReportRepository,
    private readonly publisher: MissionReportRequestPublisher
  ) {}

  async handle(event: MissionCompletedEvent): Promise<void> {
    try {
      const payload = await this.payloadBuilder.build(event.missionRunId, event.missionName)
      if (!payload) {
        logger.warn({ missionRunId: event.missionRunId }, 'MissionReportRequestListener: run introuvable')
        return
      }

      const report = MissionReport.create(event.missionRunId, event.robotDogId)
      await this.reportRepository.save(report)

      await this.publisher.publish(payload)

      logger.info({ missionRunId: event.missionRunId }, 'MissionReportRequestListener: requête publiée')
    } catch (error) {
      logger.error(
        { err: error, missionRunId: event.missionRunId },
        'MissionReportRequestListener: échec (soft-fail, la mission reste valide)'
      )
    }
  }
}
```

- [ ] **Step 4: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/unit/missions/mission-report-request.listener.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Binder `MissionReportRequestPublisher` dans `MissionProvider`**

Ajouter dans `providers/mission_provider.ts` :

```ts
import { MissionReportRequestPublisher } from '#app/modules/missions/domain/contracts/mission-report-request-publisher'
import { RabbitMqMissionReportRequestPublisher } from '#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-request-publisher'
```

```ts
    this.app.container.bind(MissionReportRequestPublisher, () => {
      return new RabbitMqMissionReportRequestPublisher()
    })
```

- [ ] **Step 6: Enregistrer le listener dans `start/events.ts`**

Ajouter l'import lazy à côté de `MissionCompletedSseListener` :

```ts
const MissionReportRequestListener = () =>
  import('#app/modules/missions/application/listeners/mission-report-request.listener')
```

Puis, à l'endroit où `emitter.on(MissionCompletedEvent, [MissionCompletedSseListener])` (ou équivalent) est déjà enregistré, ajouter un second listener sur le même event :

```ts
emitter.on(MissionCompletedEvent, [MissionReportRequestListener])
```

(Vérifier au préalable la syntaxe exacte d'enregistrement utilisée dans ce fichier pour `MissionCompletedEvent` via `grep -n "MissionCompletedEvent" start/events.ts` et répliquer le même style d'appel.)

- [ ] **Step 7: Vérifier que l'app boot toujours correctement**

Run: `node ace test --files=tests/unit/missions/mission-report-request.listener.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/modules/missions/application/listeners/mission-report-request.listener.ts \
        start/events.ts providers/mission_provider.ts \
        tests/unit/missions/mission-report-request.listener.spec.ts
git commit -m "feat: MissionReportRequestListener publie la demande de rapport PDF"
```

---

## Task 9: Application/Infra — consommateur des réponses (`mission-report.responses`)

**Files:**
- Create: `app/modules/missions/application/use-cases/handle-mission-report-response.use-case.ts`
- Create: `app/modules/missions/infrastructure/queue/rabbitmq-mission-report-response.consumer.ts`
- Modify: `providers/mission_provider.ts` (démarrage du consumer en `ready()`, environnement `web` uniquement)
- Modify: `app/modules/notifications/application/notification.service.ts` (nouveaux types)
- Modify: `resources/lang/fr/notifications.yaml`, `resources/lang/en/notifications.yaml`
- Modify: `app/modules/notifications/application/notification-message.translator.ts`
- Test: `tests/unit/missions/handle-mission-report-response.use-case.spec.ts`

**Interfaces:**
- Consumes: `MissionReportRepository` (Task 3), `NotificationService.createBulk`, `OwnershipReadRepository.findAllActiveUserIdsByRobotDogId` (déjà utilisé par `MissionCompletedSseListener`)
- Produces: `HandleMissionReportResponseUseCase.execute(response: MissionReportResponsePayload): Promise<void>` — appelé par le consumer AMQP à chaque message reçu sur `mission-report.responses`.

- [ ] **Step 1: Ajouter les 2 nouveaux types de notification**

Dans `app/modules/notifications/application/notification.service.ts`, étendre `NotificationType` :

```ts
export type NotificationType =
  | 'dog.assigned'
  | 'dog.revoked'
  | 'dog.member.assigned'
  | 'dog.member.revoked'
  | 'dog.offline'
  | 'dog.error'
  | 'dog.battery_low'
  | 'mission.started'
  | 'mission.completed'
  | 'mission.failed'
  | 'mission.start_failed'
  | 'mission.skipped'
  | 'mission.interrupted'
  | 'mission.assigned_to_dog'
  | 'mission.removed_from_dog'
  | 'mission.report_ready'
  | 'mission.report_failed'
```

- [ ] **Step 2: Ajouter les clés de traduction FR/EN**

Dans `resources/lang/fr/notifications.yaml`, sous `mission:` :

```yaml
  report_ready: "Le rapport de {mission} est disponible au téléchargement"
  report_failed: "La génération du rapport de {mission} a échoué"
```

Dans `resources/lang/en/notifications.yaml`, sous `mission:` :

```yaml
  report_ready: "{mission}'s report is ready to download"
  report_failed: "{mission}'s report generation failed"
```

- [ ] **Step 3: Brancher les nouvelles clés dans le translator**

Dans `app/modules/notifications/application/notification-message.translator.ts`, ajouter aux `MESSAGE_KEYS` :

```ts
  'mission.report_ready': 'notifications.mission.report_ready',
  'mission.report_failed': 'notifications.mission.report_failed',
```

Ces deux types ne nécessitent aucune branche spéciale : ils tombent dans le `return i18n.t(MESSAGE_KEYS[type], { dog, member, mission })` générique déjà en fin de méthode (seul `{mission}` est utilisé dans le template, `dog`/`member` sont ignorés par i18n si absents du template — cohérent avec le comportement existant pour les autres types simples).

- [ ] **Step 4: Écrire le test du use case (fail attendu : fichier inexistant)**

```ts
// tests/unit/missions/handle-mission-report-response.use-case.spec.ts
import { test } from '@japa/runner'
import { NotificationService } from '#app/modules/notifications/application/notification.service'
import { RealtimeBroadcaster } from '#app/modules/notifications/domain/contracts/realtime-broadcaster'
import { NotificationUserGateway } from '#app/modules/notifications/domain/gateways/notification-user.gateway'
import {
  NotificationRepository,
  type NotificationRecord,
  type CreateNotificationData,
} from '#app/modules/notifications/domain/contracts/notification.repository'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { HandleMissionReportResponseUseCase } from '#app/modules/missions/application/use-cases/handle-mission-report-response.use-case'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { UserLocale } from '#users/domain/user.entity'

class FakeNotificationRepository extends NotificationRepository {
  readonly created: CreateNotificationData[] = []
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    this.created.push(data)
    return { ...data, id: 'notif-1', payload: data.payload ?? null, isRead: false, createdAt: '2026-07-25T00:00:00.000Z' }
  }
  async createMany(data: CreateNotificationData[]): Promise<NotificationRecord[]> {
    this.created.push(...data)
    return data.map((d, i) => ({ ...d, id: `notif-${i}`, payload: d.payload ?? null, isRead: false, createdAt: '2026-07-25T00:00:00.000Z' }))
  }
  async findByUser(): Promise<PaginatedResult<NotificationRecord>> {
    return { data: [], meta: { total: 0, perPage: 20, currentPage: 1, firstPage: 1, lastPage: 1 } }
  }
  async markAllReadByUser(): Promise<void> {}
  async countBySeverityToday(): Promise<number> {
    return 0
  }
}

class FakeBroadcaster extends RealtimeBroadcaster {
  broadcast(): void {}
}

class FakeNotificationUserGateway extends NotificationUserGateway {
  async findLocaleById(): Promise<UserLocale> {
    return 'fr'
  }
  async findLocalesByIds(userIds: string[]): Promise<Map<string, UserLocale>> {
    return new Map(userIds.map((id) => [id, 'fr']))
  }
}

class FakeMissionReportRepository extends MissionReportRepository {
  readonly saved: MissionReport[] = []
  constructor(private readonly existing: MissionReport) {
    super()
  }
  async save(report: MissionReport): Promise<void> {
    this.saved.push(report)
  }
  async findByMissionRunId(): Promise<MissionReport | null> {
    return this.existing
  }
}

test.group('HandleMissionReportResponseUseCase', () => {
  test('sur succès : marque READY et notifie tous les propriétaires du robot', async ({ assert }) => {
    const notificationRepository = new FakeNotificationRepository()
    const notificationService = new NotificationService(
      notificationRepository,
      new FakeBroadcaster(),
      new FakeNotificationUserGateway()
    )
    const ownershipRepository = new FakeOwnershipRepository({}, { 'dog-1': ['owner-a', 'owner-b'] })
    const existing = MissionReport.create('run-1', 'dog-1')
    const reportRepository = new FakeMissionReportRepository(existing)

    const useCase = new HandleMissionReportResponseUseCase(
      reportRepository,
      ownershipRepository,
      notificationService
    )

    await useCase.execute({ missionRunId: 'run-1', status: 'SUCCESS', gcsObjectPath: 'mission-reports/run-1.pdf' })

    assert.equal(reportRepository.saved[0].status, 'READY')
    assert.equal(reportRepository.saved[0].gcsObjectPath, 'mission-reports/run-1.pdf')
    assert.lengthOf(notificationRepository.created, 2)
    assert.isTrue(notificationRepository.created.every((n) => n.type === 'mission.report_ready'))
  })

  test('sur échec : marque FAILED avec la raison et notifie en report_failed', async ({ assert }) => {
    const notificationRepository = new FakeNotificationRepository()
    const notificationService = new NotificationService(
      notificationRepository,
      new FakeBroadcaster(),
      new FakeNotificationUserGateway()
    )
    const ownershipRepository = new FakeOwnershipRepository({}, { 'dog-1': ['owner-a'] })
    const existing = MissionReport.create('run-1', 'dog-1')
    const reportRepository = new FakeMissionReportRepository(existing)

    const useCase = new HandleMissionReportResponseUseCase(
      reportRepository,
      ownershipRepository,
      notificationService
    )

    await useCase.execute({ missionRunId: 'run-1', status: 'FAILED', reason: 'gcs upload timeout' })

    assert.equal(reportRepository.saved[0].status, 'FAILED')
    assert.equal(reportRepository.saved[0].failureReason, 'gcs upload timeout')
    assert.isTrue(notificationRepository.created.every((n) => n.type === 'mission.report_failed'))
  })
})
```

Vérifier au préalable la signature exacte de `FakeOwnershipRepository` (`cat tests/unit/fakes/fake-ownership-repository.ts`) pour confirmer l'ordre des arguments du constructeur utilisé ci-dessus.

- [ ] **Step 5: Run pour vérifier l'échec**

Run: `node ace test --files=tests/unit/missions/handle-mission-report-response.use-case.spec.ts`
Expected: FAIL — module inexistant

- [ ] **Step 6: Implémenter le use case**

```ts
// app/modules/missions/application/use-cases/handle-mission-report-response.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { NotificationService } from '#app/modules/notifications/application/notification.service'

export type MissionReportResponsePayload =
  | { missionRunId: string; status: 'SUCCESS'; gcsObjectPath: string }
  | { missionRunId: string; status: 'FAILED'; reason: string }

@inject()
export class HandleMissionReportResponseUseCase {
  constructor(
    private readonly reportRepository: MissionReportRepository,
    private readonly ownershipRepository: OwnershipReadRepository,
    private readonly notificationService: NotificationService
  ) {}

  async execute(response: MissionReportResponsePayload): Promise<void> {
    const report = await this.reportRepository.findByMissionRunId(response.missionRunId)
    if (!report) {
      logger.warn({ missionRunId: response.missionRunId }, 'HandleMissionReportResponseUseCase: rapport introuvable')
      return
    }

    if (response.status === 'SUCCESS') {
      report.markReady(response.gcsObjectPath)
    } else {
      report.markFailed(response.reason)
    }
    await this.reportRepository.save(report)

    const ownerIds = await this.ownershipRepository.findAllActiveUserIdsByRobotDogId(report.robotDogId)
    const type = response.status === 'SUCCESS' ? 'mission.report_ready' : 'mission.report_failed'
    const severity = response.status === 'SUCCESS' ? 'success' : 'critical'

    await this.notificationService.createBulk(ownerIds, type, severity, {}, report.robotDogId)
  }
}
```

- [ ] **Step 7: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/unit/missions/handle-mission-report-response.use-case.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Créer le consumer AMQP**

```ts
// app/modules/missions/infrastructure/queue/rabbitmq-mission-report-response.consumer.ts
import type { Channel, ConsumeMessage } from 'amqplib'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { RabbitMqConnection } from '#app/modules/share/infrastructure/queue/rabbitmq-connection'
import {
  HandleMissionReportResponseUseCase,
  type MissionReportResponsePayload,
} from '#app/modules/missions/application/use-cases/handle-mission-report-response.use-case'

export const MISSION_REPORT_RESPONSES_QUEUE = 'mission-report.responses'

export async function startMissionReportResponseConsumer(): Promise<void> {
  const channel: Channel = await RabbitMqConnection.getChannel({
    hostname: env.get('RABBITMQ_HOST'),
    port: env.get('RABBITMQ_PORT'),
    username: env.get('RABBITMQ_USERNAME'),
    password: env.get('RABBITMQ_PASSWORD'),
    vhost: env.get('RABBITMQ_VHOST'),
  })

  await channel.assertQueue(MISSION_REPORT_RESPONSES_QUEUE, { durable: true })

  await channel.consume(MISSION_REPORT_RESPONSES_QUEUE, (message: ConsumeMessage | null) => {
    if (!message) return
    void handleMessage(channel, message)
  })
}

async function handleMessage(channel: Channel, message: ConsumeMessage): Promise<void> {
  try {
    const payload = JSON.parse(message.content.toString('utf8')) as MissionReportResponsePayload
    const useCase = await app.container.make(HandleMissionReportResponseUseCase)
    await useCase.execute(payload)
    channel.ack(message)
  } catch (error) {
    logger.error({ err: error }, 'MissionReportResponseConsumer: échec de traitement, message rejeté')
    channel.nack(message, false, false)
  }
}
```

- [ ] **Step 9: Démarrer le consumer au boot, uniquement en environnement `web`**

Dans `providers/mission_provider.ts`, ajouter la méthode `ready()` (si absente) :

```ts
  async ready() {
    if (this.app.getEnvironment() === 'web') {
      const { startMissionReportResponseConsumer } =
        await import('#app/modules/missions/infrastructure/queue/rabbitmq-mission-report-response.consumer')
      await startMissionReportResponseConsumer()
    }
  }
```

Ce guard reproduit exactement le pattern déjà utilisé dans `QueueProvider.ready()` — il garantit qu'aucune connexion RabbitMQ réelle n'est tentée pendant `node ace test` (environnement `test`, pas `web`).

- [ ] **Step 10: Vérifier que l'app démarre toujours en dev**

Run: `node ace serve --hmr` puis `Ctrl+C` une fois le serveur up
Expected: aucune erreur au boot, log de connexion RabbitMQ visible si `docker compose up -d rabbitmq` tourne.

- [ ] **Step 11: Commit**

```bash
git add app/modules/missions/application/use-cases/handle-mission-report-response.use-case.ts \
        app/modules/missions/infrastructure/queue/rabbitmq-mission-report-response.consumer.ts \
        providers/mission_provider.ts \
        app/modules/notifications/application/notification.service.ts \
        app/modules/notifications/application/notification-message.translator.ts \
        resources/lang/fr/notifications.yaml resources/lang/en/notifications.yaml \
        tests/unit/missions/handle-mission-report-response.use-case.spec.ts
git commit -m "feat: consommateur des réponses de rapport PDF + notifications report_ready/failed"
```

---

## Task 10: HTTP — endpoint de téléchargement `GET /mission-runs/:id/report`

**Files:**
- Create: `app/modules/missions/infrastructure/http/controllers/download-mission-report.controller.ts`
- Create: `app/modules/missions/application/usecases/get-mission-report-download-url.use-case.ts`
- Modify: `app/modules/missions/application/policies/mission.policy.ts`
- Modify: `app/modules/missions/infrastructure/http/routes.v1.ts`
- Modify: `start/env.ts`, `.env`, `.env.example`, `.env.test`, `.env.ci.test` (config GCS)
- Test: `tests/functional/missions/download-mission-report.spec.ts`

**Interfaces:**
- Consumes: `MissionReportRepository.findByMissionRunId` (Task 3), `@google-cloud/storage` (nouvelle dépendance)
- Produces: `GET /api/v1/mission-runs/:id/report` → `{ url: string }` (403 si le rapport n'existe pas ou n'est pas `READY`).

- [ ] **Step 1: Installer `@google-cloud/storage`**

Run: `npm install @google-cloud/storage`
Expected: ajouté à `package.json`.

- [ ] **Step 2: Ajouter les variables d'env GCS (suit exactement le pattern `FIREBASE_SERVICE_ACCOUNT_KEYS`)**

Dans `start/env.ts`, ajouter à côté du bloc Firebase :

```ts
  GCS_BUCKET_NAME: Env.schema.string.optional(),
  GCS_SERVICE_ACCOUNT_KEY: Env.schema.string.optional(),
```

Dans `.env.example` :

```
GCS_BUCKET_NAME=doggo-mission-reports
GCS_SERVICE_ACCOUNT_KEY=
```

Dans `.env` (valeur réelle à renseigner après Task 12 côté GCP), `.env.test`, `.env.ci.test` : laisser `GCS_BUCKET_NAME` et `GCS_SERVICE_ACCOUNT_KEY` vides — le use case doit gérer ce cas (voir Step 5).

- [ ] **Step 3: Ajouter la policy d'autorisation**

Dans `app/modules/missions/application/policies/mission.policy.ts`, ajouter une méthode qui vérifie la propriété du robot associé au run (le rapport porte déjà `robotDogId`, donc pas besoin de relire le `MissionRun`) :

```ts
  async downloadReport(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
```

Cette méthode prend `robotDogId` en paramètre bouncer — le controller devra d'abord charger le `MissionReport` pour connaître son `robotDogId` avant d'appeler `bouncer.with('MissionPolicy').authorize('downloadReport', robotDogId)` (voir Step 6).

- [ ] **Step 4: Écrire le test fonctionnel (fail attendu : route inexistante)**

```ts
// tests/functional/missions/download-mission-report.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionReportModel from '#app/modules/missions/infrastructure/database/models/mission-report'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { authenticateAs } from '#tests/functional/helpers/auth'
import OwnershipModel from '#app/modules/users/ownerships/infrastructure/database/models/ownership'

test.group('GET /api/v1/mission-runs/:id/report', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('retourne 403 si le rapport n\'est pas encore prêt', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { firebaseUid: 'user-report-1' })
    const dog = await RobotDogModel.create({
      id: randomUUID(), serialNumber: 'SN-REPORT-DL-001', key: 'ReportDlDogKeyAAA111',
      name: 'ReportDlDog', state: RobotDogState.IDLE, batteryLevel: 90,
    })
    await OwnershipModel.create({ id: randomUUID(), userId: auth.user.id, robotDogId: dog.id, isActive: true })
    const mission = await MissionModel.create({ id: randomUUID(), name: 'Patrouille', userId: auth.user.id })
    const run = await MissionRunModel.create({
      id: randomUUID(), missionId: mission.id, robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS, startedAt: DateTime.now(), endedAt: DateTime.now(),
    })
    await MissionReportModel.create({
      id: randomUUID(), missionRunId: run.id, robotDogId: dog.id,
      status: 'PENDING', requestedAt: DateTime.now(),
    })

    const response = await client
      .get(`/api/v1/mission-runs/${run.id}/report`)
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })
})
```

Vérifier au préalable le nom exact du modèle Lucid `Ownership` et de ses colonnes (`grep -rn "class Ownership" app/modules/users/ownerships/infrastructure/database/models/`) pour ajuster ce test si les noms diffèrent.

- [ ] **Step 5: Créer le use case**

```ts
// app/modules/missions/application/usecases/get-mission-report-download-url.use-case.ts
import { inject } from '@adonisjs/core'
import { Storage } from '@google-cloud/storage'
import env from '#start/env'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportNotReadyError } from '#app/modules/missions/domain/exceptions/mission-report-not-ready.error'
import { MissionReportNotFoundError } from '#app/modules/missions/domain/exceptions/mission-report-not-found.error'
import type MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

const SIGNED_URL_TTL_MS = 15 * 60 * 1000

@inject()
export class GetMissionReportDownloadUrlUseCase {
  constructor(private readonly reportRepository: MissionReportRepository) {}

  async execute(missionRunId: string): Promise<{ url: string; report: MissionReport }> {
    const report = await this.reportRepository.findByMissionRunId(missionRunId)
    if (!report) throw new MissionReportNotFoundError(missionRunId)
    if (report.status !== 'READY' || !report.gcsObjectPath) throw new MissionReportNotReadyError(missionRunId)

    const storage = this.buildStorageClient()
    const [url] = await storage
      .bucket(env.get('GCS_BUCKET_NAME')!)
      .file(report.gcsObjectPath)
      .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS })

    return { url, report }
  }

  private buildStorageClient(): Storage {
    const raw = env.get('GCS_SERVICE_ACCOUNT_KEY')
    if (!raw) return new Storage()

    const credentials = JSON.parse(raw) as { project_id: string; private_key: string; client_email: string }
    return new Storage({ projectId: credentials.project_id, credentials })
  }
}
```

```ts
// app/modules/missions/domain/exceptions/mission-report-not-found.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionReportNotFoundError extends DomainError {
  readonly httpStatus = 403
  readonly code = 'MISSION_REPORT_NOT_FOUND'
  constructor(missionRunId: string) {
    super(`No mission report for run ${missionRunId}`)
  }
}
```

```ts
// app/modules/missions/domain/exceptions/mission-report-not-ready.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionReportNotReadyError extends DomainError {
  readonly httpStatus = 403
  readonly code = 'MISSION_REPORT_NOT_READY'
  constructor(missionRunId: string) {
    super(`Mission report for run ${missionRunId} is not ready yet`)
  }
}
```

(Vérifier au préalable le mécanisme de conversion `DomainError` → réponse HTTP déjà en place — `grep -rn "DomainError" app/exceptions/handler.ts` — pour confirmer que `httpStatus` est bien lu automatiquement, sans besoin de traitement custom dans le controller.)

- [ ] **Step 6: Créer le controller**

```ts
// app/modules/missions/infrastructure/http/controllers/download-mission-report.controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GetMissionReportDownloadUrlUseCase } from '#app/modules/missions/application/usecases/get-mission-report-download-url.use-case'

@inject()
export default class DownloadMissionReportController {
  constructor(private readonly useCase: GetMissionReportDownloadUrlUseCase) {}

  async handle({ params, bouncer, response }: HttpContext) {
    const { url, report } = await this.useCase.execute(params.id)
    await bouncer.with('MissionPolicy').authorize('downloadReport', report.robotDogId)

    return response.ok({ url })
  }
}
```

Note : l'autorisation est vérifiée **après** avoir chargé le report (pour connaître `robotDogId`), mais **avant** de renvoyer l'URL au client — un utilisateur non autorisé ne doit jamais recevoir l'URL signée, même par erreur. Si `bouncer.authorize` lève avant `response.ok`, aucune fuite n'a lieu.

- [ ] **Step 7: Enregistrer la route**

Dans `app/modules/missions/infrastructure/http/routes.v1.ts`, ajouter l'import lazy et la route dans un nouveau groupe (le préfixe existant est `/api/v1/missions`, mais cette route est sous `/api/v1/mission-runs`) :

```ts
const DownloadMissionReportController = () =>
  import('#app/modules/missions/infrastructure/http/controllers/download-mission-report.controller')
```

```ts
router
  .group(() => {
    router.get('/:id/report', [DownloadMissionReportController])
  })
  .prefix('/api/v1/mission-runs')
  .use(middleware.firebaseAuth())
```

- [ ] **Step 8: Run pour vérifier que le test passe**

Run: `node ace test --files=tests/functional/missions/download-mission-report.spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json start/env.ts .env.example .env.test .env.ci.test \
        app/modules/missions/application/usecases/get-mission-report-download-url.use-case.ts \
        app/modules/missions/application/policies/mission.policy.ts \
        app/modules/missions/domain/exceptions/mission-report-not-found.error.ts \
        app/modules/missions/domain/exceptions/mission-report-not-ready.error.ts \
        app/modules/missions/infrastructure/http/controllers/download-mission-report.controller.ts \
        app/modules/missions/infrastructure/http/routes.v1.ts \
        tests/functional/missions/download-mission-report.spec.ts
git commit -m "feat: endpoint de téléchargement du rapport PDF via URL signée GCS"
```

---

## Task 11: Worker Rust — scaffold du projet + config

**Files:**
- Create: `worker/Cargo.toml`
- Create: `worker/src/config.rs`
- Create: `worker/src/model.rs`
- Create: `worker/Dockerfile`
- Create: `worker/.dockerignore`

**Interfaces:**
- Produces: `Config::from_env() -> Config` (champs `amqp_host`, `amqp_port`, `amqp_username`, `amqp_password`, `amqp_vhost`, `gcs_bucket`), `MissionReportRequest`/`MissionReportResponse` (structs `serde`) — consommés par toutes les tâches Rust suivantes.

- [ ] **Step 1: Initialiser le projet Cargo**

Run: `cd .. && mkdir -p worker/src && cd worker && cargo init --name mission-report-worker`
Expected: `worker/Cargo.toml` et `worker/src/main.rs` créés.

- [ ] **Step 2: Écrire `Cargo.toml`**

```toml
[package]
name = "mission-report-worker"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["rt-multi-thread", "macros", "net", "time", "fs"] }
lapin = "4.10"
futures-lite = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
printpdf = "0.12"
google-cloud-storage = "1.16"
anyhow = "1"
thiserror = "1"
```

- [ ] **Step 3: Créer le module de configuration**

```rust
// worker/src/config.rs
pub struct Config {
    pub amqp_host: String,
    pub amqp_port: u16,
    pub amqp_username: String,
    pub amqp_password: Option<String>,
    pub amqp_vhost: String,
    pub gcs_bucket: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            amqp_host: std::env::var("RABBITMQ_HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            amqp_port: std::env::var("RABBITMQ_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(5672),
            amqp_username: std::env::var("RABBITMQ_USERNAME").unwrap_or_else(|_| "doggo".into()),
            amqp_password: std::env::var("RABBITMQ_PASSWORD").ok(),
            amqp_vhost: std::env::var("RABBITMQ_VHOST").unwrap_or_else(|_| "/".into()),
            gcs_bucket: std::env::var("GCS_BUCKET_NAME").expect("GCS_BUCKET_NAME must be set"),
        }
    }

    pub fn amqp_addr(&self) -> String {
        let auth = match &self.amqp_password {
            Some(password) => format!("{}:{}", self.amqp_username, password),
            None => self.amqp_username.clone(),
        };
        format!(
            "amqp://{}@{}:{}/{}",
            auth,
            self.amqp_host,
            self.amqp_port,
            self.amqp_vhost.trim_start_matches('/')
        )
    }
}
```

- [ ] **Step 4: Créer les modèles de message (miroir exact du contrat Node défini en Task 6/9)**

```rust
// worker/src/model.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct MissionReportStep {
    pub name: String,
    pub status: String,
    pub order: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MissionReportRequest {
    #[serde(rename = "missionRunId")]
    pub mission_run_id: String,
    #[serde(rename = "missionName")]
    pub mission_name: String,
    #[serde(rename = "robotDogName")]
    pub robot_dog_name: String,
    pub status: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<String>,
    pub steps: Vec<MissionReportStep>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status")]
pub enum MissionReportResponse {
    #[serde(rename = "SUCCESS")]
    Success {
        #[serde(rename = "missionRunId")]
        mission_run_id: String,
        #[serde(rename = "gcsObjectPath")]
        gcs_object_path: String,
    },
    #[serde(rename = "FAILED")]
    Failed {
        #[serde(rename = "missionRunId")]
        mission_run_id: String,
        reason: String,
    },
}
```

- [ ] **Step 5: Écrire le `Dockerfile`**

```dockerfile
# worker/Dockerfile
FROM rust:1-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
COPY assets ./assets
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/mission-report-worker ./mission-report-worker
COPY --from=builder /app/assets ./assets
CMD ["./mission-report-worker"]
```

- [ ] **Step 6: Créer `.dockerignore`**

```
target
```

- [ ] **Step 7: Vérifier que le projet compile (échouera tant que `main.rs` référence les modules non encore branchés — à ce stade, laisser `main.rs` au contenu généré par `cargo init` et juste vérifier que les deps se résolvent)**

Ajouter temporairement en tête de `worker/src/main.rs` généré par `cargo init` :

```rust
mod config;
mod model;

fn main() {
    let _ = config::Config::from_env;
    println!("Hello, world!");
}
```

Run: `cd worker && cargo check`
Expected: compile sans erreur (warnings de champs non lus tolérés à ce stade, seront utilisés dans les tâches suivantes).

- [ ] **Step 8: Commit**

```bash
cd ..
git add worker/Cargo.toml worker/Cargo.lock worker/src/config.rs worker/src/model.rs \
        worker/src/main.rs worker/Dockerfile worker/.dockerignore worker/.gitignore
git commit -m "chore: scaffold du worker Rust (config, modèles de message, Dockerfile)"
```

---

## Task 12: Worker Rust — génération du PDF

**Files:**
- Create: `worker/assets/DejaVuSans.ttf`
- Create: `worker/src/pdf.rs`
- Modify: `worker/src/main.rs`

**Interfaces:**
- Consumes: `MissionReportRequest` (Task 11)
- Produces: `pdf::build(request: &MissionReportRequest) -> Vec<u8>` — consommé par Task 15 (boucle principale).

- [ ] **Step 1: Télécharger la police DejaVu Sans (police libre, nécessaire car `printpdf` 0.12 n'embarque plus de police par défaut)**

Run: `curl -L -o worker/assets/DejaVuSans.ttf https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf`
Expected: fichier `worker/assets/DejaVuSans.ttf` présent, quelques centaines de Ko.

- [ ] **Step 2: Écrire le test unitaire de rendu (fail attendu : module inexistant)**

Ajouter en bas de `worker/src/pdf.rs` (créé au Step 3) :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{MissionReportRequest, MissionReportStep};

    fn sample_request() -> MissionReportRequest {
        MissionReportRequest {
            mission_run_id: "run-1".into(),
            mission_name: "Patrouille".into(),
            robot_dog_name: "Rex".into(),
            status: "SUCCESS".into(),
            started_at: "2026-07-25T10:00:00.000Z".into(),
            ended_at: Some("2026-07-25T10:15:00.000Z".into()),
            steps: vec![MissionReportStep { name: "Avancer".into(), status: "COMPLETED".into(), order: 1 }],
        }
    }

    #[test]
    fn produces_non_empty_pdf_bytes() {
        let bytes = build(&sample_request());
        assert!(!bytes.is_empty());
        assert_eq!(&bytes[0..4], b"%PDF");
    }
}
```

- [ ] **Step 3: Implémenter `build()`**

```rust
// worker/src/pdf.rs
use printpdf::*;
use crate::model::MissionReportRequest;

const FONT_BYTES: &[u8] = include_bytes!("../assets/DejaVuSans.ttf");

pub fn build(request: &MissionReportRequest) -> Vec<u8> {
    let font = ParsedFont::from_bytes(FONT_BYTES, 0, &mut Vec::new()).expect("embedded font must parse");
    let mut doc = PdfDocument::new(&format!("Rapport de mission - {}", request.mission_name));
    let font_id = doc.add_font(&font);

    let mut ops = vec![Op::StartTextSection];
    let mut y = 270.0;

    ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
    ops.push(Op::SetFont { font: PdfFontHandle::External(font_id), size: Pt(18.0) });
    ops.push(Op::ShowText { items: vec![TextItem::Text(request.mission_name.clone())] });

    let fields = [
        ("Robot", request.robot_dog_name.clone()),
        ("Statut", request.status.clone()),
        ("Début", request.started_at.clone()),
        ("Fin", request.ended_at.clone().unwrap_or_else(|| "-".to_string())),
    ];

    for (label, value) in fields {
        y -= 8.0;
        ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
        ops.push(Op::SetFont { font: PdfFontHandle::External(font_id), size: Pt(11.0) });
        ops.push(Op::ShowText { items: vec![TextItem::Text(format!("{label}: {value}"))] });
    }

    y -= 10.0;
    ops.push(Op::SetTextCursor { pos: Point { x: Mm(20.0).into(), y: Mm(y).into() } });
    ops.push(Op::ShowText { items: vec![TextItem::Text("Étapes:".to_string())] });

    for step in &request.steps {
        y -= 6.0;
        ops.push(Op::SetTextCursor { pos: Point { x: Mm(25.0).into(), y: Mm(y).into() } });
        ops.push(Op::ShowText {
            items: vec![TextItem::Text(format!("{}. {} — {}", step.order, step.name, step.status))],
        });
    }

    ops.push(Op::EndTextSection);

    let page = PdfPage::new(Mm(210.0), Mm(297.0), ops);
    doc.with_pages(vec![page]).save(&PdfSaveOptions::default(), &mut Vec::new())
}
```

- [ ] **Step 4: Ajouter `mod pdf;` dans `main.rs` et vérifier la compilation**

Run: `cd worker && cargo test pdf::tests::produces_non_empty_pdf_bytes`
Expected: PASS. Si l'API exacte de `printpdf` 0.12 diverge (types/paramètres renommés depuis la rédaction de ce plan), ajuster `build()` en suivant les erreurs du compilateur — la structure (titre, champs clé/valeur, liste de steps, retour en `Vec<u8>`) doit rester la même.

- [ ] **Step 5: Commit**

```bash
cd ..
git add worker/assets/DejaVuSans.ttf worker/src/pdf.rs worker/src/main.rs
git commit -m "feat(worker): génération de PDF de rapport de mission avec printpdf"
```

---

## Task 13: Worker Rust — upload GCS

**Files:**
- Create: `worker/src/storage.rs`
- Modify: `worker/src/main.rs`

**Interfaces:**
- Consumes: `Config.gcs_bucket` (Task 11)
- Produces: `storage::upload(bucket: &str, object_name: &str, bytes: Vec<u8>) -> anyhow::Result<()>` — consommé par Task 15.

- [ ] **Step 1: Implémenter l'upload**

```rust
// worker/src/storage.rs
use google_cloud_storage::client::Storage;

pub async fn upload(bucket: &str, object_name: &str, bytes: Vec<u8>) -> anyhow::Result<()> {
    let client = Storage::builder().build().await?;
    client
        .write_object(format!("projects/_/buckets/{bucket}"), object_name, bytes)
        .send_unbuffered()
        .await?;
    Ok(())
}
```

Note : ce client lit les credentials via la variable d'environnement standard `GOOGLE_APPLICATION_CREDENTIALS` (chemin vers le fichier JSON du service-account dédié au bucket, en écriture seule — voir Task 16 pour sa création). Aucune credential Firebase/Backend n'est partagée avec le Worker.

- [ ] **Step 2: Ajouter `mod storage;` dans `main.rs` et vérifier la compilation**

Run: `cd worker && cargo check`
Expected: compile sans erreur. Si l'API du crate `google-cloud-storage` 1.16 a changé depuis la rédaction de ce plan, ajuster selon les erreurs du compilateur — la signature `upload(bucket, object_name, bytes) -> Result<()>` doit rester stable pour Task 15.

- [ ] **Step 3: Commit**

```bash
git add worker/src/storage.rs worker/src/main.rs
git commit -m "feat(worker): upload du PDF généré vers GCS"
```

---

## Task 14: Worker Rust — retry/backoff

**Files:**
- Create: `worker/src/retry.rs`
- Modify: `worker/src/main.rs`

**Interfaces:**
- Produces: `retry::with_backoff<F, Fut, T>(attempts: &[std::time::Duration], operation: F) -> anyhow::Result<T>` où `F: Fn() -> Fut`, `Fut: Future<Output = anyhow::Result<T>>` — consommé par Task 15.

- [ ] **Step 1: Écrire le test unitaire (fail attendu : module inexistant)**

Ajouter en bas de `worker/src/retry.rs` (créé au Step 2) :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::time::Duration;

    #[tokio::test]
    async fn retries_until_success_within_attempts() {
        let counter = AtomicU32::new(0);
        let result = with_backoff(&[Duration::from_millis(1), Duration::from_millis(1)], || async {
            let attempt = counter.fetch_add(1, Ordering::SeqCst);
            if attempt < 2 {
                anyhow::bail!("transient failure")
            }
            Ok(42)
        })
        .await;

        assert_eq!(result.unwrap(), 42);
        assert_eq!(counter.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn gives_up_after_exhausting_attempts() {
        let result: anyhow::Result<u32> = with_backoff(&[Duration::from_millis(1)], || async {
            anyhow::bail!("always fails")
        })
        .await;

        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: Implémenter `with_backoff`**

```rust
// worker/src/retry.rs
use std::future::Future;
use std::time::Duration;

pub async fn with_backoff<F, Fut, T>(delays_between_retries: &[Duration], operation: F) -> anyhow::Result<T>
where
    F: Fn() -> Fut,
    Fut: Future<Output = anyhow::Result<T>>,
{
    let mut last_error = None;

    match operation().await {
        Ok(value) => return Ok(value),
        Err(err) => last_error = Some(err),
    }

    for delay in delays_between_retries {
        tokio::time::sleep(*delay).await;
        match operation().await {
            Ok(value) => return Ok(value),
            Err(err) => last_error = Some(err),
        }
    }

    Err(last_error.expect("at least one attempt always runs"))
}
```

- [ ] **Step 3: Ajouter `mod retry;` dans `main.rs` et lancer les tests**

Run: `cd worker && cargo test retry::tests`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add worker/src/retry.rs worker/src/main.rs
git commit -m "feat(worker): politique de retry avec backoff exponentiel"
```

---

## Task 15: Worker Rust — boucle principale (consume → render → upload → respond)

**Files:**
- Modify: `worker/src/main.rs`
- Create: `worker/src/amqp.rs`

**Interfaces:**
- Consumes: `pdf::build` (Task 12), `storage::upload` (Task 13), `retry::with_backoff` (Task 14), `MissionReportRequest`/`MissionReportResponse` (Task 11)
- Produces: le binaire complet — consomme `mission-report.requests`, ack/nack correctement, publie toujours une réponse sur `mission-report.responses`.

- [ ] **Step 1: Implémenter les helpers AMQP (déclaration des queues, consume, publish)**

```rust
// worker/src/amqp.rs
use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection, ConnectionProperties,
};

pub const REQUESTS_QUEUE: &str = "mission-report.requests";
pub const RESPONSES_QUEUE: &str = "mission-report.responses";

pub async fn connect(addr: &str) -> lapin::Result<Channel> {
    let connection = Connection::connect(addr, ConnectionProperties::default()).await?;
    let channel = connection.create_channel().await?;

    channel
        .queue_declare(REQUESTS_QUEUE, QueueDeclareOptions { durable: true, ..Default::default() }, FieldTable::default())
        .await?;
    channel
        .queue_declare(RESPONSES_QUEUE, QueueDeclareOptions { durable: true, ..Default::default() }, FieldTable::default())
        .await?;

    Ok(channel)
}

pub async fn publish_response(channel: &Channel, body: &[u8]) -> lapin::Result<()> {
    channel
        .basic_publish(
            "",
            RESPONSES_QUEUE,
            BasicPublishOptions::default(),
            body,
            BasicProperties::default().with_delivery_mode(2),
        )
        .await?
        .await?;
    Ok(())
}
```

- [ ] **Step 2: Écrire la boucle principale**

```rust
// worker/src/main.rs
mod amqp;
mod config;
mod model;
mod pdf;
mod retry;
mod storage;

use futures_lite::stream::StreamExt;
use lapin::options::{BasicAckOptions, BasicConsumeOptions, BasicNackOptions};
use lapin::types::FieldTable;
use std::time::Duration;

use config::Config;
use model::{MissionReportRequest, MissionReportResponse};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::from_env();
    let channel = amqp::connect(&config.amqp_addr()).await?;

    let mut consumer = channel
        .basic_consume(
            amqp::REQUESTS_QUEUE,
            "mission-report-worker",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    println!("mission-report-worker: en attente de messages sur {}", amqp::REQUESTS_QUEUE);

    while let Some(delivery) = consumer.next().await {
        let delivery = match delivery {
            Ok(delivery) => delivery,
            Err(err) => {
                eprintln!("erreur de livraison AMQP: {err}");
                continue;
            }
        };

        let request: MissionReportRequest = match serde_json::from_slice(&delivery.data) {
            Ok(request) => request,
            Err(err) => {
                eprintln!("message de requête invalide, rejeté sans requeue: {err}");
                delivery.nack(BasicNackOptions { requeue: false, ..Default::default() }).await?;
                continue;
            }
        };

        let response = process_request(&config, &request).await;
        let body = serde_json::to_vec(&response)?;

        if let Err(err) = amqp::publish_response(&channel, &body).await {
            eprintln!("échec de publication de la réponse pour {}: {err}", request.mission_run_id);
        }

        delivery.ack(BasicAckOptions::default()).await?;
    }

    Ok(())
}

const RETRY_DELAYS: [Duration; 2] = [Duration::from_secs(5), Duration::from_secs(30)];

async fn process_request(config: &Config, request: &MissionReportRequest) -> MissionReportResponse {
    let object_name = format!("mission-reports/{}.pdf", request.mission_run_id);
    let bucket = config.gcs_bucket.clone();
    let object_name_for_retry = object_name.clone();

    let result = retry::with_backoff(&RETRY_DELAYS, || {
        let bucket = bucket.clone();
        let object_name = object_name_for_retry.clone();
        let bytes = pdf::build(request);
        async move { storage::upload(&bucket, &object_name, bytes).await }
    })
    .await;

    match result {
        Ok(()) => MissionReportResponse::Success {
            mission_run_id: request.mission_run_id.clone(),
            gcs_object_path: object_name,
        },
        Err(err) => MissionReportResponse::Failed {
            mission_run_id: request.mission_run_id.clone(),
            reason: err.to_string(),
        },
    }
}
```

Cette implémentation respecte le contrat "toujours répondre" : le message de requête est acquitté (`delivery.ack`) **après** la tentative de publication de la réponse, qu'elle ait réussi (`Success`) ou échoué définitivement après retries (`Failed`) — jamais de silence.

- [ ] **Step 3: Vérifier que tout compile et que les tests unitaires passent toujours**

Run: `cd worker && cargo test`
Expected: PASS (tests de `pdf` et `retry`)

- [ ] **Step 4: Test d'intégration manuel bout-en-bout (nécessite RabbitMQ + GCS credentials configurés)**

Run (depuis `backend/`): `docker compose up -d rabbitmq`, puis (depuis `worker/`) `RABBITMQ_HOST=127.0.0.1 RABBITMQ_PORT=5672 RABBITMQ_USERNAME=doggo RABBITMQ_PASSWORD=doggo_password GCS_BUCKET_NAME=<bucket> GOOGLE_APPLICATION_CREDENTIALS=<path> cargo run`

Publier manuellement un message de test sur `mission-report.requests` (via l'interface RabbitMQ Management sur `http://localhost:15672`, user `doggo`/`doggo_password`) avec un payload `MissionReportRequest` JSON, et vérifier qu'une réponse apparaît sur `mission-report.responses`.
Expected: réponse `SUCCESS` avec un `gcsObjectPath`, objet visible dans le bucket GCS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/amqp.rs worker/src/main.rs
git commit -m "feat(worker): boucle principale consume/render/upload/respond avec retry"
```

---

## Task 16: Ops — GCP (bucket + service accounts) et docker-compose local

**Files:**
- Modify: `docker-compose.yml` (service `worker`, optionnel pour le dev local)
- Modify: `deploy/` (documentation, pas de script `gcloud` — setup manuel via la console, cohérent avec le reste du déploiement de ce projet)

**Interfaces:**
- Produces: bucket GCS + 2 service-accounts (lecture/signature côté Backend, écriture côté Worker) ; entrée `worker` dans `docker-compose.yml` pour le dev local.

- [ ] **Step 1: Créer le bucket GCS (console GCP, projet `doggo-502614`, région `europe-west1`)**

Dans la console GCP → Cloud Storage → Créer un bucket : nom `doggo-mission-reports`, région `europe-west1`, classe de stockage Standard, accès uniforme au niveau du bucket, pas d'accès public.

- [ ] **Step 2: Créer le service-account du Worker (écriture seule)**

Console GCP → IAM & Admin → Comptes de service → Créer : nom `mission-report-worker`, rôle **Storage Object Creator** limité au bucket `doggo-mission-reports` (via une condition IAM sur la ressource, ou en accordant le rôle au niveau du bucket directement dans l'onglet Autorisations du bucket plutôt qu'au niveau projet). Générer une clé JSON, la conserver hors du repo (ex. `worker/config/gcs-worker-key.json`, à ajouter à `.gitignore`).

- [ ] **Step 3: Créer le service-account du Backend (lecture + signature d'URL)**

Même procédure : nom `mission-report-backend`, rôle **Storage Object Viewer** sur le même bucket. Générer une clé JSON. Son contenu devient la valeur de `GCS_SERVICE_ACCOUNT_KEY` (JSON brut, même pattern que `FIREBASE_SERVICE_ACCOUNT_KEYS` — via Secret Manager en prod sur Cloud Run, via `.env` local en dev).

- [ ] **Step 4: Ajouter `worker/.gitignore` pour ne jamais committer de clé**

```
target
config/*.json
```

- [ ] **Step 5: Ajouter un service `worker` optionnel à `docker-compose.yml` pour le dev local**

```yaml
  worker:
    build: ../worker
    container_name: robot_dog_mission_report_worker
    restart: unless-stopped
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USERNAME: doggo
      RABBITMQ_PASSWORD: doggo_password
      GCS_BUCKET_NAME: doggo-mission-reports
      GOOGLE_APPLICATION_CREDENTIALS: /secrets/gcs-worker-key.json
    volumes:
      - ./worker-secrets/gcs-worker-key.json:/secrets/gcs-worker-key.json:ro
```

Note : `RABBITMQ_HOST: rabbitmq` fonctionne car le worker et RabbitMQ partagent le même réseau docker-compose (nom du service = nom d'hôte résolvable).

- [ ] **Step 6: Démarrer la stack complète et vérifier le round-trip**

Run: `docker compose up -d --build`
Expected: `docker compose ps` montre `rabbitmq`, `worker`, `postgres`, `redis`, `mosquitto` tous `Up`/`healthy`. Déclencher une mission réelle jusqu'à `SUCCESS` via l'app (ou le test fonctionnel de Task 10) et vérifier dans les logs (`docker compose logs worker`) que le message est bien consommé et qu'une réponse part.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: ajoute le service worker au docker-compose local"
```

---

## Self-Review

**Couverture du spec :**
- Deux queues RabbitMQ dédiées Backend↔Worker, aucun appel synchrone Worker→Backend → Task 1, 6, 9, 15.
- Worker isolé (aucun accès DB/modèles Lucid), toutes les données reçues en entrée → Task 11 (payload JSON autoportant), Task 13 (credentials GCS dédiées, distinctes du Backend).
- Le Worker répond toujours, même en échec → Task 15 (`MissionReportResponse::Failed` systématique après épuisement des retries).
- Politique de retry déterminée par le Worker selon la criticité → Task 14 (backoff 5s/30s, tâche non-critique), documenté dans le spec.
- Tâche métier spécifique au domaine (génération de PDF) → Task 12.
- Bonus Rust → Task 11-15 intégralement en Rust.
- Persistance et notification côté Backend → Task 3, 9, 10.

**Décisions de périmètre actées pendant le brainstorming/planning :**
- Déclencheur limité à SUCCESS/FAILED (`MissionCompletedEvent`) — INTERRUPTED/LAUNCH_FAILED explicitement hors périmètre (voir Global Constraints et spec).
- RabbitMQ choisi plutôt que Redis Streams pour éviter de réimplémenter le protocole BullMQ en Rust.
- GCS choisi pour le stockage, avec deux service-accounts distincts (écriture Worker / lecture-signature Backend), suivant le pattern déjà en place pour `FIREBASE_SERVICE_ACCOUNT_KEYS`.

**Points de vigilance pour l'exécution (pas des trous du plan, mais des vérifications à faire en conditions réelles) :**
- Task 4, Step 3 : la variable `run` doit être vérifiée dans son scope réel avant modification — le plan documente les deux cas possibles (accessible directement, ou à faire remonter via `outcome`).
- Task 7/9 : plusieurs signatures exactes (`RobotDog.rehydrate`, `FakeOwnershipRepository`, modèle `Ownership`) sont à confirmer par grep avant d'écrire le test final, comme indiqué dans chaque step concerné.
- Task 12/13 : les API exactes de `printpdf` 0.12 et `google-cloud-storage` 1.16 peuvent avoir évolué depuis la rédaction de ce plan (crates jeunes/actifs) — `cargo check`/`cargo test` guideront les ajustements mineurs de signature si besoin.
