# Fiabilisation du CRUD Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sécuriser le CRUD `Action` déjà existant (`app/modules/actions/`) : remplacer la suppression physique en cascade par une désactivation logique, permettre l'édition du `code` technique, verrouiller l'édition du `parameterSchema` pour les actions déjà utilisées, filtrer la visibilité par statut, empêcher l'assignation de nouvelles étapes à une action désactivée, et combler l'absence de tests HTTP.

**Architecture:** Aucun nouveau module. Toutes les modifications restent dans le module `actions` existant (`domain/application/infrastructure`), plus deux points d'intégration ciblés dans le module `missions` (`AddMissionStepUseCase`, `SyncMissionStepsUseCase`). Le couplage entre `actions` et `missions` pour vérifier l'usage d'une action se fait via un nouveau contrat `MissionStepUsageGateway` (domaine `actions`), implémenté en infrastructure par une requête directe sur `MissionStepModel` (module `missions`) — même pattern que `RobotDogGateway`/`UserGateway` déjà utilisés dans `missions`.

**Tech Stack:** AdonisJS 6/7, Lucid ORM (PostgreSQL), VineJS, Bouncer, Japa (unit + functional), même conventions que le reste du backend.

## Global Constraints

- Spec source : `docs/superpowers/specs/2026-07-21-actions-crud-hardening-design.md`.
- `DELETE /api/v1/actions/:id` devient une désactivation logique (`is_active = false`), jamais bloquée par l'usage.
- `PATCH /api/v1/actions/:id/toggle` (nouveau) permet de réactiver/désactiver, sur le modèle exact de `ToggleMissionScheduleController`.
- `code` devient éditable via `PATCH /api/v1/actions/:id`, avec contrôle d'unicité (comme à la création).
- `parameterSchema` reste éditable uniquement si l'action n'est référencée par aucun `mission_step` — sinon `ActionParameterSchemaLockedError` (409).
- `GET /api/v1/actions` ne retourne que les actions actives par défaut ; `includeInactive=true` n'est honoré que pour un utilisateur `ADMIN`.
- `GET /api/v1/actions/:id` reste inchangé (visible même désactivée).
- Une action désactivée ne peut pas être assignée à un **nouveau** `mission_step` (`AddMissionStepUseCase`, et `SyncMissionStepsUseCase` uniquement pour les items sans `id`). Les steps existants qui la référencent déjà continuent de fonctionner.
- Hors scope : tout système de compatibilité action ↔ version/modèle de robot ; toute UI frontend.
- Commande de test de ce projet : `node ace test --files="<chemin/du/fichier.spec.ts>"`. Commandes de migration : `node ace migration:run` / `node ace migration:rollback`.

---

### Task 1: Migration — colonne `is_active` sur `actions`

**Files:**
- Create: `database/migrations/1784100000000_add_is_active_to_actions_table.ts`

**Interfaces:**
- Produces: colonne `actions.is_active boolean not null default true`. Consommée par les Tasks 3, 4, 5, 6, 7, 9.

- [ ] **Step 1: Write the migration**

```typescript
// database/migrations/1784100000000_add_is_active_to_actions_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_active').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_active')
    })
  }
}
```

- [ ] **Step 2: Run the migration**

Run: `node ace migration:run`
Expected: output includes `migrated database/migrations/1784100000000_add_is_active_to_actions_table.ts`

- [ ] **Step 3: Verify rollback and re-apply**

Run: `node ace migration:rollback`
Expected: output includes `reverted database/migrations/1784100000000_add_is_active_to_actions_table.ts`

Run: `node ace migration:run`
Expected: migration re-applied.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/1784100000000_add_is_active_to_actions_table.ts
git commit -m "feat(actions): add is_active column to actions table"
```

---

### Task 2: Migration — FK `mission_steps.action_id` en `RESTRICT`

**Files:**
- Create: `database/migrations/1784200000000_change_mission_steps_action_fk_to_restrict.ts`
- Modify: `database/seeders/mission-seeder.ts:72-74`

**Interfaces:**
- Produces: FK `mission_steps.action_id → actions.id` en `ON DELETE RESTRICT` (au lieu de `CASCADE`).

- [ ] **Step 1: Write the migration**

```typescript
// database/migrations/1784200000000_change_mission_steps_action_fk_to_restrict.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mission_steps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('action_id')
      table.foreign('action_id').references('id').inTable('actions').onDelete('RESTRICT')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('action_id')
      table.foreign('action_id').references('id').inTable('actions').onDelete('CASCADE')
    })
  }
}
```

- [ ] **Step 2: Run the migration**

Run: `node ace migration:run`
Expected: output includes `migrated database/migrations/1784200000000_change_mission_steps_action_fk_to_restrict.ts`

- [ ] **Step 3: Verify rollback and re-apply**

Run: `node ace migration:rollback`
Expected: output includes `reverted database/migrations/1784200000000_change_mission_steps_action_fk_to_restrict.ts`

Run: `node ace migration:run`
Expected: migration re-applied.

- [ ] **Step 4: Update the stale comment in the seeder**

The comment in `database/seeders/mission-seeder.ts` describes the old `CASCADE` behavior, which is no longer accurate now that the FK is `RESTRICT`.

In `database/seeders/mission-seeder.ts`, replace:

```typescript
  private async ensureActions(): Promise<ActionModel[]> {
    // Supprime l'ancienne action MOVE (remplacée par MOVE_DISTANCE + MOVE_DURATION).
    // Les steps qui la référençaient sont cascade-deleted via la FK.
    await ActionModel.query().where('code', 'MOVE').delete()
```

with:

```typescript
  private async ensureActions(): Promise<ActionModel[]> {
    // Supprime l'ancienne action MOVE (remplacée par MOVE_DISTANCE + MOVE_DURATION), si elle
    // existe encore. La FK action_id est désormais RESTRICT : ce delete échouerait si un
    // mission_step la référençait encore, ce qui n'est plus le cas dans les environnements déjà migrés.
    await ActionModel.query().where('code', 'MOVE').delete()
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/1784200000000_change_mission_steps_action_fk_to_restrict.ts database/seeders/mission-seeder.ts
git commit -m "feat(actions): restrict deletion of actions referenced by mission steps"
```

---

### Task 3: Domain — `Action` entity: `isActive`, `activate`, `deactivate`, `updateCode`

**Files:**
- Modify: `app/modules/actions/domain/action.entity.ts`
- Test: `tests/unit/actions/domain/action.spec.ts`

**Interfaces:**
- Produces: `Action.create(...)` unchanged signature (always `isActive = true` internally). `Action.rehydrate(id, code, name, slug, description, parameterSchema = null, isActive = true)`. New instance members: `get isActive(): boolean`, `activate(): void`, `deactivate(): void`, `updateCode(code: string): void`. Consumed by Tasks 4, 6, 7, 8, 10.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/actions/domain/action.spec.ts`, inside the existing `test.group('Unit | Actions | ActionEntity', () => { ... })`, right after the last existing test (before the closing `})`):

```typescript
  // -------------------
  // isActive / activate / deactivate / updateCode
  // -------------------

  test('it should be active by default when created', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'slug', null)
    assert.isTrue(action.isActive)
  })

  test('it should rehydrate as active by default when isActive is omitted', ({ assert }) => {
    const action = Action.rehydrate('550e8400-e29b-41d4-a716-446655440000', 'CODE', 'Name', 'slug', null)
    assert.isTrue(action.isActive)
  })

  test('it should rehydrate with the given isActive value', ({ assert }) => {
    const action = Action.rehydrate(
      '550e8400-e29b-41d4-a716-446655440000',
      'CODE',
      'Name',
      'slug',
      null,
      null,
      false
    )
    assert.isFalse(action.isActive)
  })

  test('it should deactivate and reactivate', ({ assert }) => {
    const action = Action.create('ACT', 'Name', 'slug', null)

    action.deactivate()
    assert.isFalse(action.isActive)

    action.activate()
    assert.isTrue(action.isActive)
  })

  test('it should update the code and uppercase it', ({ assert }) => {
    const action = Action.create('old_code', 'Name', 'slug', null)

    action.updateCode('new_code')
    assert.equal(action.code, 'NEW_CODE')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node ace test --files="tests/unit/actions/domain/action.spec.ts"`
Expected: FAIL — `action.isActive is not a function` / `undefined`, `action.deactivate is not a function`, `action.updateCode is not a function`.

- [ ] **Step 3: Implement in the entity**

In `app/modules/actions/domain/action.entity.ts`, replace the whole file with:

```typescript
import { ActionId } from './value-objects/action-id.js'
import { InvalidActionPropertyError } from '#app/modules/actions/domain/exceptions/invalid-action-property.error'
import { InvalidActionParametersError } from '#app/modules/actions/domain/exceptions/invalid-action-parameters.error'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

export default class Action {
  private constructor(
    private readonly _id: ActionId,
    private _code: string,
    private _name: string,
    private _slug: string,
    private _description: string | null,
    private _parameterSchema: ActionParameterSchema | null,
    private _isActive: boolean
  ) {}

  public static create(
    code: string,
    name: string,
    slug: string,
    description: string | null,
    parameterSchema: ActionParameterSchema | null = null
  ): Action {
    return new Action(
      ActionId.generate(),
      code.toUpperCase(),
      name,
      slug,
      description ?? null,
      parameterSchema,
      true
    )
  }

  public static rehydrate(
    id: string,
    code: string,
    name: string,
    slug: string,
    description: string | null,
    parameterSchema: ActionParameterSchema | null = null,
    isActive: boolean = true
  ): Action {
    return new Action(
      ActionId.fromString(id),
      code,
      name,
      slug,
      description ?? null,
      parameterSchema,
      isActive
    )
  }

  // -------------------
  // Getters
  // -------------------

  public get id(): ActionId {
    return this._id
  }

  public get code(): string {
    return this._code
  }

  public get name(): string {
    return this._name
  }

  public get slug(): string {
    return this._slug
  }

  public get description(): string | null {
    return this._description
  }

  public get parameterSchema(): ActionParameterSchema | null {
    return this._parameterSchema
  }

  public get isActive(): boolean {
    return this._isActive
  }

  // -------------------
  // Business
  // -------------------

  public updateName(name: string): void {
    const cleaned = name.trim()
    if (cleaned.length < 1 || cleaned.length > 50) {
      throw new InvalidActionPropertyError('name', 'must be between 1 and 50 characters')
    }
    this._name = cleaned
  }

  public updateSlug(slug: string): void {
    this._slug = this.validateString(slug, 'slug').toLowerCase()
  }

  public updateCode(code: string): void {
    this._code = code.toUpperCase()
  }

  public updateDescription(description: string | null): void {
    this._description = description ?? null
  }

  public updateParameterSchema(schema: ActionParameterSchema | null): void {
    this._parameterSchema = schema
  }

  public activate(): void {
    this._isActive = true
  }

  public deactivate(): void {
    this._isActive = false
  }

  /**
   * Valide que paramsJson respecte le schema de cette action.
   * Si l'action n'a pas de schema, tout JSON valide est accepté.
   * Lance InvalidActionParametersError en cas d'échec.
   */
  public validateParameters(paramsJson: string): void {
    if (!this._parameterSchema) return

    let parsed: unknown
    try {
      parsed = JSON.parse(paramsJson)
    } catch {
      throw new InvalidActionParametersError('parameters', 'must be valid JSON')
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new InvalidActionParametersError('parameters', 'must be a JSON object')
    }

    const obj = parsed as Record<string, unknown>

    for (const field of this._parameterSchema.fields) {
      const value = obj[field.name]

      if (field.required && (value === undefined || value === null)) {
        throw new InvalidActionParametersError(field.name, 'is required')
      }

      if (value === undefined || value === null) continue

      if (field.type === 'number') {
        if (typeof value !== 'number') {
          throw new InvalidActionParametersError(field.name, `must be a number`)
        }
        if (field.min !== undefined && value < field.min) {
          throw new InvalidActionParametersError(field.name, `must be >= ${field.min}`)
        }
        if (field.max !== undefined && value > field.max) {
          throw new InvalidActionParametersError(field.name, `must be <= ${field.max}`)
        }
      }

      if (field.type === 'string' && typeof value !== 'string') {
        throw new InvalidActionParametersError(field.name, 'must be a string')
      }

      if (field.type === 'boolean' && typeof value !== 'boolean') {
        throw new InvalidActionParametersError(field.name, 'must be a boolean')
      }
    }
  }

  private validateString(value: string, fieldName: string): string {
    const cleaned = value.trim()

    if (/\s/.test(cleaned)) {
      throw new InvalidActionPropertyError(fieldName, 'should not contain spaces')
    }

    if (cleaned.length < 1 || cleaned.length > 50) {
      throw new InvalidActionPropertyError(fieldName, 'must be between 1 and 50 characters')
    }

    return cleaned
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node ace test --files="tests/unit/actions/domain/action.spec.ts"`
Expected: PASS (all tests, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add app/modules/actions/domain/action.entity.ts tests/unit/actions/domain/action.spec.ts
git commit -m "feat(actions): add isActive, activate, deactivate and updateCode to Action entity"
```

---

### Task 4: Infrastructure — persister `isActive` (modèle, repository, fake, contrat `index`)

**Files:**
- Modify: `app/modules/actions/infrastructure/database/models/action.ts`
- Modify: `app/modules/actions/domain/contracts/action.repository.ts`
- Modify: `app/modules/actions/infrastructure/database/repositories/action.repository.implementation.ts`
- Modify: `tests/unit/fakes/fake-action-repository.ts`

**Interfaces:**
- Consumes: `Action.isActive`, `Action.rehydrate(..., isActive)` (Task 3).
- Produces: `IndexActionOptions` (exported from `action.repository.ts`, extends `PaginationDto` with `includeInactive?: boolean`). `ActionRepository.index(options?: IndexActionOptions)`. `ActionModel.isActive: boolean`. Consumed by Tasks 6, 7, 8, 9, 10.

- [ ] **Step 1: Update the Lucid model**

In `app/modules/actions/infrastructure/database/models/action.ts`, add the `isActive` column after `parameterSchema`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

export default class ActionModel extends BaseModel {
  public static table = 'actions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare parameterSchema: ActionParameterSchema | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

- [ ] **Step 2: Update the repository contract**

Replace `app/modules/actions/domain/contracts/action.repository.ts` with:

```typescript
import type { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import type { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import type { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import type Action from '#app/modules/actions/domain/action.entity'

export interface IndexActionOptions extends PaginationDto {
  includeInactive?: boolean
}

export abstract class ActionRepository {
  abstract findById(id: ActionId): Promise<Action | null>

  abstract findByCode(code: string): Promise<Action | null>

  abstract index(options?: IndexActionOptions): Promise<PaginatedResult<Action>>

  abstract save(action: Action): Promise<void>

  abstract delete(id: ActionId): Promise<void>
}
```

- [ ] **Step 3: Update the repository implementation**

Replace `app/modules/actions/infrastructure/database/repositories/action.repository.implementation.ts` with:

```typescript
import {
  type ActionRepository,
  type IndexActionOptions,
} from '#app/modules/actions/domain/contracts/action.repository'
import Action from '#app/modules/actions/domain/action.entity'
import { type ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import db from '@adonisjs/lucid/services/db'

export class ActionRepositoryImplementation implements ActionRepository {
  async findById(id: ActionId): Promise<Action | null> {
    const row = await ActionModel.find(id.value)
    if (!row) return null
    return Action.rehydrate(
      row.id,
      row.code,
      row.name,
      row.slug,
      row.description,
      row.parameterSchema ?? null,
      row.isActive
    )
  }

  async findByCode(code: string): Promise<Action | null> {
    const row = await ActionModel.query().where('code', code.toUpperCase()).first()
    if (!row) return null
    return Action.rehydrate(
      row.id,
      row.code,
      row.name,
      row.slug,
      row.description,
      row.parameterSchema ?? null,
      row.isActive
    )
  }

  async index(options?: IndexActionOptions): Promise<PaginatedResult<Action>> {
    const page = options?.page ?? 1
    const perPage = options?.limit ?? 10

    const query = ActionModel.query().orderBy('id', 'desc')
    if (!options?.includeInactive) {
      query.where('isActive', true)
    }

    const paginator = await query.paginate(page, perPage)

    const data = paginator.all().map((row) => {
      return Action.rehydrate(
        row.id,
        row.code,
        row.name,
        row.slug,
        row.description,
        row.parameterSchema ?? null,
        row.isActive
      )
    })

    return {
      data,
      meta: {
        total: paginator.total,
        perPage: paginator.perPage,
        currentPage: paginator.currentPage,
        firstPage: paginator.firstPage,
        lastPage: paginator.lastPage,
      },
    }
  }

  async save(action: Action): Promise<void> {
    await db.transaction(async (trx) => {
      await ActionModel.updateOrCreate(
        { id: action.id.value },
        {
          slug: action.slug,
          description: action.description,
          code: action.code,
          name: action.name,
          parameterSchema: action.parameterSchema,
          isActive: action.isActive,
        },
        { client: trx }
      )
    })
  }

  async delete(id: ActionId): Promise<void> {
    const row = await ActionModel.find(id.value)
    if (!row) return
    await row.delete()
  }
}
```

- [ ] **Step 4: Update the fake repository used by unit tests**

Replace `tests/unit/fakes/fake-action-repository.ts` with:

```typescript
import {
  type ActionRepository,
  type IndexActionOptions,
} from '#app/modules/actions/domain/contracts/action.repository'
import type Action from '#app/modules/actions/domain/action.entity'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type ActionId } from '#app/modules/actions/domain/value-objects/action-id'

export class FakeActionRepository implements ActionRepository {
  public actions: Action[] = []

  async findById(id: ActionId): Promise<Action | null> {
    return this.actions.find((a) => a.id.value === id.value) || null
  }

  async findByCode(code: string): Promise<Action | null> {
    return this.actions.find((a) => a.code === code) || null
  }

  async index(options?: IndexActionOptions): Promise<PaginatedResult<Action>> {
    const page = options?.page || 1
    const limit = options?.limit || 10

    const filtered = options?.includeInactive
      ? this.actions
      : this.actions.filter((a) => a.isActive)

    const start = (page - 1) * limit
    const end = start + limit
    const items = filtered.slice(start, end)

    return {
      data: items,
      meta: {
        total: filtered.length,
        perPage: limit,
        currentPage: page,
        lastPage: Math.ceil(filtered.length / limit),
        firstPage: 1,
      },
    }
  }

  async save(action: Action): Promise<void> {
    const index = this.actions.findIndex((a) => a.id.value === action.id.value)

    if (index !== -1) {
      this.actions[index] = action
    } else {
      this.actions.push(action)
    }
  }

  async delete(id: ActionId): Promise<void> {
    this.actions = this.actions.filter((a) => a.id.value !== id.value)
  }
}
```

- [ ] **Step 5: Run existing actions unit tests to verify nothing broke**

Run: `node ace test --files="tests/unit/actions/application/usecases/create-action.spec.ts"`
Expected: PASS.

Run: `node ace test --files="tests/unit/actions/application/usecases/index-action.spec.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/modules/actions/infrastructure/database/models/action.ts app/modules/actions/domain/contracts/action.repository.ts app/modules/actions/infrastructure/database/repositories/action.repository.implementation.ts tests/unit/fakes/fake-action-repository.ts
git commit -m "feat(actions): persist and filter isActive across repository, model and fake"
```

---

### Task 5: Infrastructure — `ActionTransformer` expose `slug` et `isActive`

**Files:**
- Modify: `app/modules/actions/infrastructure/http/transformers/action.transformer.ts`

**Interfaces:**
- Consumes: `Action.slug`, `Action.isActive` (Task 3, pre-existing for `slug`).
- Produces: JSON `{ id, code, name, slug, description, parameterSchema, isActive }` for every action-returning endpoint. Consumed by Task 11 (functional tests assert on these fields).

- [ ] **Step 1: Update the transformer**

Replace `app/modules/actions/infrastructure/http/transformers/action.transformer.ts` with:

```typescript
import { BaseTransformer } from '@adonisjs/core/transformers'
import type Action from '#app/modules/actions/domain/action.entity'

export default class ActionTransformer extends BaseTransformer<Action> {
  toObject() {
    return {
      id: this.resource.id.value,
      code: this.resource.code,
      name: this.resource.name,
      slug: this.resource.slug,
      description: this.resource.description,
      parameterSchema: this.resource.parameterSchema,
      isActive: this.resource.isActive,
    }
  }
}
```

There is no existing unit test for this transformer; its behavior is covered by the functional tests added in Tasks 6, 7, 8, 9 and 11 (they assert on `response.body().slug` / `response.body().isActive`).

- [ ] **Step 2: Commit**

```bash
git add app/modules/actions/infrastructure/http/transformers/action.transformer.ts
git commit -m "fix(actions): expose slug and isActive in ActionTransformer output"
```

---

### Task 6: Application — `DestroyActionUseCase` devient une désactivation

**Files:**
- Modify: `app/modules/actions/application/usecases/destroy-action.use-case.ts`
- Modify: `app/modules/actions/infrastructure/http/controllers/destroy-action.controller.ts`
- Modify: `tests/unit/actions/application/usecases/destroy-action.spec.ts`
- Create: `tests/functional/actions/infrastructure/http/destroy-action.spec.ts`

**Interfaces:**
- Consumes: `Action.deactivate()` (Task 3), `ActionRepository.save`/`findById`.
- Produces: `DELETE /api/v1/actions/:id` now returns `200 { message }` and sets `is_active = false` instead of deleting the row.

- [ ] **Step 1: Write the failing unit test**

Replace `tests/unit/actions/application/usecases/destroy-action.spec.ts` with:

```typescript
import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'

test.group('Unit | Actions | DestroyActionUseCase', () => {
  test('it should deactivate an existing action instead of deleting it', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('DEACTIVATE_ME', 'Deactivate Me', 'deactivate-me', null)
    await fakeRepository.save(action)

    const useCase = new DestroyActionUseCase(fakeRepository)
    await useCase.execute({ id: action.id.value })

    assert.equal(fakeRepository.actions.length, 1)
    const stillThere = await fakeRepository.findById(action.id)
    assert.isNotNull(stillThere)
    assert.isFalse(stillThere?.isActive)
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

    const useCase = new DestroyActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId }),
      ActionNotFoundError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/actions/application/usecases/destroy-action.spec.ts"`
Expected: FAIL — the first test's `assert.equal(fakeRepository.actions.length, 1)` fails because the current implementation still removes the action from the array.

- [ ] **Step 3: Implement the use case change**

Replace `app/modules/actions/application/usecases/destroy-action.use-case.ts` with:

```typescript
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { DestroyActionDto } from '#app/modules/actions/application/dto/destroy-action.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'

@inject()
export class DestroyActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: DestroyActionDto): Promise<void> {
    logger.info({ actionId: dto.id }, 'Attempting to deactivate action')

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      logger.warn({ actionId: dto.id }, 'Deactivate action failed: Action not found')
      throw new ActionNotFoundError(actionId.value)
    }

    action.deactivate()
    await this.actionRepository.save(action)
  }
}
```

- [ ] **Step 4: Update the controller response**

Replace `app/modules/actions/infrastructure/http/controllers/destroy-action.controller.ts` with:

```typescript
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyActionUseCase } from '#app/modules/actions/application/usecases/destroy-action.use-case'

@inject()
export default class DestroyActionController {
  constructor(private readonly useCase: DestroyActionUseCase) {}

  async handle({ params, response, logger, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('destroy')

    const id = params.id

    logger.info('Starting Action deactivation', { id })

    await this.useCase.execute({ id })

    logger.info('Action successfully deactivated', { id })

    return response.status(200).json({
      message: 'Action deactivated successfully',
    })
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/actions/application/usecases/destroy-action.spec.ts"`
Expected: PASS.

- [ ] **Step 6: Write the functional test**

Create `tests/functional/actions/infrastructure/http/destroy-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('DELETE /api/v1/actions/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should deactivate the action instead of deleting it', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: true,
    })

    const response = await client
      .delete(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(200)

    const stillThere = await ActionModel.find(action.id)
    assert.exists(stillThere)
    assert.isFalse(stillThere!.isActive)
  })

  test('should return 404 when action does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .delete('/api/v1/actions/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: true,
    })

    const response = await client
      .delete(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })
})
```

- [ ] **Step 7: Run the functional test**

Run: `node ace test --files="tests/functional/actions/infrastructure/http/destroy-action.spec.ts"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/modules/actions/application/usecases/destroy-action.use-case.ts app/modules/actions/infrastructure/http/controllers/destroy-action.controller.ts tests/unit/actions/application/usecases/destroy-action.spec.ts tests/functional/actions/infrastructure/http/destroy-action.spec.ts
git commit -m "feat(actions): DELETE /actions/:id now deactivates instead of hard-deleting"
```

---

### Task 7: Application — endpoint `toggle` pour réactiver/désactiver une action

**Files:**
- Create: `app/modules/actions/application/dto/toggle-action.dto.ts`
- Create: `app/modules/actions/infrastructure/http/validators/toggle-action.validator.ts`
- Create: `app/modules/actions/application/usecases/toggle-action.use-case.ts`
- Create: `app/modules/actions/infrastructure/http/controllers/toggle-action.controller.ts`
- Modify: `app/modules/actions/infrastructure/http/routes.v1.ts`
- Create: `tests/unit/actions/application/usecases/toggle-action.spec.ts`
- Create: `tests/functional/actions/infrastructure/http/toggle-action.spec.ts`

**Interfaces:**
- Consumes: `Action.activate()`/`deactivate()` (Task 3), `ActionRepository`.
- Produces: `PATCH /api/v1/actions/:id/toggle` with body `{ isActive: boolean }`, admin-only, `200 { message }`.

- [ ] **Step 1: Write the DTO and validator**

Create `app/modules/actions/application/dto/toggle-action.dto.ts`:

```typescript
export class ToggleActionDto {
  constructor(
    public readonly id: string,
    public readonly isActive: boolean
  ) {}
}
```

Create `app/modules/actions/infrastructure/http/validators/toggle-action.validator.ts`:

```typescript
import vine from '@vinejs/vine'

export const ToggleActionValidator = vine.create({
  isActive: vine.boolean(),
})
```

- [ ] **Step 2: Write the failing unit test**

Create `tests/unit/actions/application/usecases/toggle-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import Action from '#app/modules/actions/domain/action.entity'
import { ToggleActionUseCase } from '#app/modules/actions/application/usecases/toggle-action.use-case'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'

test.group('Unit | Actions | ToggleActionUseCase', () => {
  test('it should reactivate a deactivated action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('BARK', 'Aboyer', 'bark', null)
    action.deactivate()
    await fakeRepository.save(action)

    const useCase = new ToggleActionUseCase(fakeRepository)
    await useCase.execute(new ToggleActionDto(action.id.value, true))

    const updated = await fakeRepository.findById(action.id)
    assert.isTrue(updated?.isActive)
  })

  test('it should deactivate an active action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('BARK', 'Aboyer', 'bark', null)
    await fakeRepository.save(action)

    const useCase = new ToggleActionUseCase(fakeRepository)
    await useCase.execute(new ToggleActionDto(action.id.value, false))

    const updated = await fakeRepository.findById(action.id)
    assert.isFalse(updated?.isActive)
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000'

    const useCase = new ToggleActionUseCase(fakeRepository)

    await assert.rejects(
      async () => await useCase.execute(new ToggleActionDto(nonExistentId, true)),
      ActionNotFoundError
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node ace test --files="tests/unit/actions/application/usecases/toggle-action.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/actions/application/usecases/toggle-action.use-case'`.

- [ ] **Step 4: Implement the use case**

Create `app/modules/actions/application/usecases/toggle-action.use-case.ts`:

```typescript
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'

@inject()
export class ToggleActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: ToggleActionDto): Promise<void> {
    logger.info('ToggleActionUseCase started', { dto })

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    if (dto.isActive) {
      action.activate()
    } else {
      action.deactivate()
    }

    await this.actionRepository.save(action)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/actions/application/usecases/toggle-action.spec.ts"`
Expected: PASS.

- [ ] **Step 6: Wire the HTTP controller and route**

Create `app/modules/actions/infrastructure/http/controllers/toggle-action.controller.ts`:

```typescript
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ToggleActionValidator } from '#app/modules/actions/infrastructure/http/validators/toggle-action.validator'
import { ToggleActionUseCase } from '#app/modules/actions/application/usecases/toggle-action.use-case'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'

@inject()
export default class ToggleActionController {
  constructor(private readonly useCase: ToggleActionUseCase) {}

  async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('update')

    const payload = await request.validateUsing(ToggleActionValidator)
    await this.useCase.execute(new ToggleActionDto(params.id, payload.isActive))

    return response.ok({ message: 'Action toggled successfully' })
  }
}
```

In `app/modules/actions/infrastructure/http/routes.v1.ts`, add the import and route:

```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CreateActionController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/create-action.controller')

const IndexController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/index-action.controller')

const ShowController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/show-action.controller')

const DestroyController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/destroy-action.controller')

const UpdateController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/update-action.controller')

const ToggleController = () =>
  import('#app/modules/actions/infrastructure/http/controllers/toggle-action.controller')

router
  .group(() => {
    router.post('/', [CreateActionController])
    router.get('/', [IndexController])
    router.get('/:id', [ShowController])
    router.delete('/:id', [DestroyController])
    router.patch('/:id', [UpdateController])
    router.patch('/:id/toggle', [ToggleController])
  })
  .prefix('/api/v1/actions')
  .use(middleware.firebaseAuth())
```

- [ ] **Step 7: Write and run the functional test**

Create `tests/functional/actions/infrastructure/http/toggle-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('PATCH /api/v1/actions/:id/toggle', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should reactivate a deactivated action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: false,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}/toggle`)
      .header('Authorization', auth.header)
      .json({ isActive: true })

    response.assertStatus(200)

    const updated = await ActionModel.find(action.id)
    assert.isTrue(updated!.isActive)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: false,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}/toggle`)
      .header('Authorization', auth.header)
      .json({ isActive: true })

    response.assertStatus(403)
  })
})
```

Run: `node ace test --files="tests/functional/actions/infrastructure/http/toggle-action.spec.ts"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/modules/actions/application/dto/toggle-action.dto.ts app/modules/actions/infrastructure/http/validators/toggle-action.validator.ts app/modules/actions/application/usecases/toggle-action.use-case.ts app/modules/actions/infrastructure/http/controllers/toggle-action.controller.ts app/modules/actions/infrastructure/http/routes.v1.ts tests/unit/actions/application/usecases/toggle-action.spec.ts tests/functional/actions/infrastructure/http/toggle-action.spec.ts
git commit -m "feat(actions): add PATCH /actions/:id/toggle to reactivate or deactivate an action"
```

---

### Task 8: Application — `code` éditable + verrou de `parameterSchema` si utilisée

**Files:**
- Create: `app/modules/actions/domain/exceptions/action-parameter-schema-locked.error.ts`
- Create: `app/modules/actions/domain/contracts/mission-step-usage.gateway.ts`
- Create: `app/modules/actions/infrastructure/gateways/mission-step-usage.gateway.implementation.ts`
- Create: `tests/unit/fakes/fake-mission-step-usage-gateway.ts`
- Modify: `providers/action_provider.ts`
- Modify: `app/modules/actions/application/dto/update-action.dto.ts`
- Modify: `app/modules/actions/infrastructure/http/validators/update-action.validator.ts`
- Modify: `app/modules/actions/application/usecases/update-action.use-case.ts`
- Modify: `tests/unit/actions/application/usecases/update-action.spec.ts`
- Create: `tests/functional/actions/infrastructure/http/update-action.spec.ts`

**Interfaces:**
- Consumes: `Action.updateCode()` (Task 3), `MissionStepModel` (`app/modules/missions/infrastructure/database/models/mission-step`, pre-existing).
- Produces: `MissionStepUsageGateway.isActionUsed(actionId: string): Promise<boolean>`. `ActionParameterSchemaLockedError` (409). `PATCH /api/v1/actions/:id` accepts `code` and enforces the schema lock.

- [ ] **Step 1: Write the new domain error**

Create `app/modules/actions/domain/exceptions/action-parameter-schema-locked.error.ts`:

```typescript
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionParameterSchemaLockedError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_PARAMETER_SCHEMA_LOCKED'

  constructor(id: string) {
    super(
      'Action with id ' + id + ' is already used by a mission step, its parameterSchema cannot be changed'
    )
    this.name = 'ActionParameterSchemaLockedError'
  }
}
```

- [ ] **Step 2: Write the gateway contract and its fake**

Create `app/modules/actions/domain/contracts/mission-step-usage.gateway.ts`:

```typescript
export abstract class MissionStepUsageGateway {
  abstract isActionUsed(actionId: string): Promise<boolean>
}
```

Create `tests/unit/fakes/fake-mission-step-usage-gateway.ts`:

```typescript
import { type MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'

export class FakeMissionStepUsageGateway implements MissionStepUsageGateway {
  public usedActionIds: Set<string> = new Set()

  async isActionUsed(actionId: string): Promise<boolean> {
    return this.usedActionIds.has(actionId)
  }
}
```

- [ ] **Step 3: Write the failing unit tests for `UpdateActionUseCase`**

Replace `tests/unit/actions/application/usecases/update-action.spec.ts` with:

```typescript
import { test } from '@japa/runner'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import { ActionParameterSchemaLockedError } from '#app/modules/actions/domain/exceptions/action-parameter-schema-locked.error'
import Action from '#app/modules/actions/domain/action.entity'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { FakeMissionStepUsageGateway } from '#tests/unit/fakes/fake-mission-step-usage-gateway'
import { UpdateActionUseCase } from '#app/modules/actions/application/usecases/update-action.use-case'

test.group('Unit | Actions | UpdateActionUseCase', () => {
  test('it should update an existing action', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('OLD_CODE', 'Old Name', 'old-slug', 'Old Desc')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      name: 'New Name',
      slug: 'new-slug',
      description: 'New Desc',
    })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'New Name')
    assert.equal(updated?.slug, 'new-slug')
    assert.equal(updated?.description, 'New Desc')
  })

  test('it should update only provided fields', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Original Name', 'original-slug', 'Original Desc')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      name: 'Updated Name',
    })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'Updated Name')
    assert.equal(updated?.slug, 'original-slug')
    assert.equal(updated?.description, 'Original Desc')
  })

  test('it should throw ActionNotFoundError when action does not exist', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const nonExistentId = 'bc5e0278-f864-44b4-84c6-433b5a932d20'

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await assert.rejects(
      async () => await useCase.execute({ id: nonExistentId, name: 'New Name' }),
      ActionNotFoundError
    )
  })

  test('it should update description to null when provided', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', 'Some description')
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      description: null,
    })

    const updated = await fakeRepository.findById(action.id)
    assert.isNull(updated?.description)
  })

  test('it should update the code when the new code is unique', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('OLD_CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({ id: action.id.value, code: 'new_code' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.code, 'NEW_CODE')
  })

  test('it should throw ActionAlreadyExistsError when the new code is used by another action', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE_A', 'A', 'a', null)
    const other = Action.create('CODE_B', 'B', 'b', null)
    await fakeRepository.save(action)
    await fakeRepository.save(other)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await assert.rejects(
      async () => await useCase.execute({ id: action.id.value, code: 'CODE_B' }),
      ActionAlreadyExistsError
    )
  })

  test('it should not throw when the code is updated to its own current value', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('SAME_CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({ id: action.id.value, code: 'SAME_CODE' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.code, 'SAME_CODE')
  })

  test('it should update parameterSchema when the action is not used by any mission step', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const useCase = new UpdateActionUseCase(fakeRepository, new FakeMissionStepUsageGateway())

    await useCase.execute({
      id: action.id.value,
      parameterSchema: { fields: [] },
    })

    const updated = await fakeRepository.findById(action.id)
    assert.deepEqual(updated?.parameterSchema, { fields: [] })
  })

  test('it should throw ActionParameterSchemaLockedError when the action is used by a mission step', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Name', 'slug', null)
    await fakeRepository.save(action)

    const gateway = new FakeMissionStepUsageGateway()
    gateway.usedActionIds.add(action.id.value)

    const useCase = new UpdateActionUseCase(fakeRepository, gateway)

    await assert.rejects(
      async () =>
        await useCase.execute({
          id: action.id.value,
          parameterSchema: { fields: [] },
        }),
      ActionParameterSchemaLockedError
    )
  })

  test('it should allow updating name even when the action is used, as long as parameterSchema is untouched', async ({
    assert,
  }) => {
    const fakeRepository = new FakeActionRepository()
    const action = Action.create('CODE', 'Old Name', 'slug', null)
    await fakeRepository.save(action)

    const gateway = new FakeMissionStepUsageGateway()
    gateway.usedActionIds.add(action.id.value)

    const useCase = new UpdateActionUseCase(fakeRepository, gateway)

    await useCase.execute({ id: action.id.value, name: 'New Name' })

    const updated = await fakeRepository.findById(action.id)
    assert.equal(updated?.name, 'New Name')
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `node ace test --files="tests/unit/actions/application/usecases/update-action.spec.ts"`
Expected: FAIL — `UpdateActionUseCase` constructor currently takes one argument, and `code`/schema-lock behavior does not exist yet.

- [ ] **Step 5: Update the DTO and validator**

Replace `app/modules/actions/application/dto/update-action.dto.ts` with:

```typescript
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

export class UpdateActionDto {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly slug?: string,
    public readonly code?: string,
    public readonly description?: string | null,
    public readonly parameterSchema?: ActionParameterSchema | null
  ) {}
}
```

Replace `app/modules/actions/infrastructure/http/validators/update-action.validator.ts` with:

```typescript
import vine from '@vinejs/vine'

const parameterFieldSchema = vine.object({
  name: vine.string().minLength(1).maxLength(50),
  label: vine.string().minLength(1).maxLength(100),
  type: vine.enum(['number', 'string', 'boolean'] as const),
  required: vine.boolean(),
  unit: vine.string().optional(),
  min: vine.number().optional(),
  max: vine.number().optional(),
  defaultValue: vine.any().optional(),
})

export const UpdateActionValidator = vine.create(
  vine.object({
    name: vine.string().minLength(1).trim().maxLength(50).optional(),
    slug: vine
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .maxLength(100)
      .optional(),
    code: vine.string().minLength(1).trim().maxLength(100).optional(),
    description: vine.string().minLength(1).nullable().optional(),
    parameterSchema: vine
      .object({ fields: vine.array(parameterFieldSchema) })
      .nullable()
      .optional(),
  })
)
```

- [ ] **Step 6: Implement the use case**

Replace `app/modules/actions/application/usecases/update-action.use-case.ts` with:

```typescript
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { UpdateActionDto } from '#app/modules/actions/application/dto/update-action.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import { ActionParameterSchemaLockedError } from '#app/modules/actions/domain/exceptions/action-parameter-schema-locked.error'
import { MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'

@inject()
export class UpdateActionUseCase {
  constructor(
    private actionRepository: ActionRepository,
    private missionStepUsageGateway: MissionStepUsageGateway
  ) {}

  async execute(dto: UpdateActionDto): Promise<void> {
    logger.info('UpdateActionUseCase started', { dto })

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    if (dto.code) {
      const normalizedCode = dto.code.toUpperCase()
      if (normalizedCode !== action.code) {
        const existing = await this.actionRepository.findByCode(dto.code)
        if (existing && existing.id.value !== action.id.value) {
          throw new ActionAlreadyExistsError(dto.code)
        }
      }
      action.updateCode(dto.code)
    }

    if (dto.name) action.updateName(dto.name)
    if (dto.slug) action.updateSlug(dto.slug)

    if (dto.description !== undefined) {
      action.updateDescription(dto.description)
    }

    if (dto.parameterSchema !== undefined) {
      const isUsed = await this.missionStepUsageGateway.isActionUsed(action.id.value)
      if (isUsed) {
        throw new ActionParameterSchemaLockedError(action.id.value)
      }
      action.updateParameterSchema(dto.parameterSchema ?? null)
    }

    await this.actionRepository.save(action)
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `node ace test --files="tests/unit/actions/application/usecases/update-action.spec.ts"`
Expected: PASS.

- [ ] **Step 8: Implement the gateway and wire it in the provider**

Create `app/modules/actions/infrastructure/gateways/mission-step-usage.gateway.implementation.ts`:

```typescript
import { MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'

export class MissionStepUsageGatewayImplementation implements MissionStepUsageGateway {
  async isActionUsed(actionId: string): Promise<boolean> {
    const step = await MissionStepModel.query().where('actionId', actionId).first()
    return step !== null
  }
}
```

Replace `providers/action_provider.ts` with:

```typescript
import type { ApplicationService } from '@adonisjs/core/types'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionRepositoryImplementation } from '#app/modules/actions/infrastructure/database/repositories/action.repository.implementation'
import { MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'
import { MissionStepUsageGatewayImplementation } from '#app/modules/actions/infrastructure/gateways/mission-step-usage.gateway.implementation'

export default class ActionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(ActionRepository, () => {
      return this.app.container.make(ActionRepositoryImplementation)
    })

    this.app.container.bind(MissionStepUsageGateway, () => {
      return this.app.container.make(MissionStepUsageGatewayImplementation)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
```

- [ ] **Step 9: Write and run the functional test**

Create `tests/functional/actions/infrastructure/http/update-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('PATCH /api/v1/actions/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should update the code of an unused action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'OLD_CODE',
      name: 'Name',
      slug: 'name',
      description: null,
      isActive: true,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ code: 'NEW_CODE' })

    response.assertStatus(200)

    const updated = await ActionModel.find(action.id)
    assert.equal(updated!.code, 'NEW_CODE')
  })

  test('should return 409 when changing parameterSchema of an action already used by a mission step', async ({
    client,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'MOVE_TEST',
      name: 'Move',
      slug: 'move-test',
      description: null,
      isActive: true,
    })

    const owner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-update-action' })
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: owner.user.id,
    })

    await MissionStepModel.create({
      id: randomUUID(),
      missionId: mission.id,
      actionId: action.id,
      sequenceOrder: 1,
      parameters: '{}',
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ parameterSchema: { fields: [] } })

    response.assertStatus(409)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: true,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ name: 'Nope' })

    response.assertStatus(403)
  })
})
```

Run: `node ace test --files="tests/functional/actions/infrastructure/http/update-action.spec.ts"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/modules/actions/domain/exceptions/action-parameter-schema-locked.error.ts app/modules/actions/domain/contracts/mission-step-usage.gateway.ts app/modules/actions/infrastructure/gateways/mission-step-usage.gateway.implementation.ts tests/unit/fakes/fake-mission-step-usage-gateway.ts providers/action_provider.ts app/modules/actions/application/dto/update-action.dto.ts app/modules/actions/infrastructure/http/validators/update-action.validator.ts app/modules/actions/application/usecases/update-action.use-case.ts tests/unit/actions/application/usecases/update-action.spec.ts tests/functional/actions/infrastructure/http/update-action.spec.ts
git commit -m "feat(actions): make code editable and lock parameterSchema edits when an action is in use"
```

---

### Task 9: Application — `IndexActionUseCase` filtre par statut, `includeInactive` réservé aux admins

**Files:**
- Modify: `app/modules/actions/application/usecases/index-action.use-case.ts`
- Modify: `app/modules/actions/infrastructure/http/controllers/index-action.controller.ts`
- Create: `tests/unit/actions/application/usecases/index-action.spec.ts` additions (see Step 1)
- Create: `tests/functional/actions/infrastructure/http/index-action.spec.ts`

**Interfaces:**
- Consumes: `IndexActionOptions`, `ActionRepository.index` (Task 4), `HttpContext.authenticatedUser` (pre-existing, set by `FirebaseAuthMiddleware`), `UserRole` (`#users/domain/enums/user.role`).
- Produces: `GET /api/v1/actions` excludes inactive actions by default; `?includeInactive=true` only takes effect for `ADMIN`.

- [ ] **Step 1: Read the existing unit test and add failing cases**

Read `tests/unit/actions/application/usecases/index-action.spec.ts` first — it currently only checks that `execute` delegates to the repository. Append this test at the end of its `test.group(...)` body (before the closing `})`):

```typescript
  test('it forwards includeInactive to the repository', async ({ assert }) => {
    const fakeRepository = new FakeActionRepository()
    const active = Action.create('ACTIVE', 'Active', 'active', null)
    const inactive = Action.create('INACTIVE', 'Inactive', 'inactive', null)
    inactive.deactivate()
    await fakeRepository.save(active)
    await fakeRepository.save(inactive)

    const useCase = new IndexActionUseCase(fakeRepository)

    const defaultResult = await useCase.execute({})
    assert.lengthOf(defaultResult.data, 1)
    assert.equal(defaultResult.data[0].code, 'ACTIVE')

    const fullResult = await useCase.execute({ includeInactive: true })
    assert.lengthOf(fullResult.data, 2)
  })
```

Add the required imports at the top of the file if not already present: `import Action from '#app/modules/actions/domain/action.entity'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/actions/application/usecases/index-action.spec.ts"`
Expected: FAIL — the default call currently returns both actions (no filtering happens yet at this layer; Task 4 already made `FakeActionRepository.index` filter correctly, so this specific test should actually already pass after Task 4 — confirm by running it. If it passes already, this step's purpose is just to lock in the behavior; proceed to Step 3 regardless since `IndexActionUseCase`'s parameter type still needs updating for type-correctness.).

- [ ] **Step 3: Update the use case's parameter type**

Replace `app/modules/actions/application/usecases/index-action.use-case.ts` with:

```typescript
import {
  ActionRepository,
  type IndexActionOptions,
} from '#app/modules/actions/domain/contracts/action.repository'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Action from '#app/modules/actions/domain/action.entity'

@inject()
export class IndexActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(params: IndexActionOptions): Promise<PaginatedResult<Action>> {
    logger.info('IndexActionUseCase started', { params })
    return await this.actionRepository.index(params)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/actions/application/usecases/index-action.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Update the controller to gate `includeInactive` by role**

Replace `app/modules/actions/infrastructure/http/controllers/index-action.controller.ts` with:

```typescript
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ActionTransformer from '#app/modules/actions/infrastructure/http/transformers/action.transformer'
import { type IndexActionOptions } from '#app/modules/actions/domain/contracts/action.repository'
import { IndexActionUseCase } from '#app/modules/actions/application/usecases/index-action.use-case'
import { UserRole } from '#users/domain/enums/user.role'

@inject()
export default class IndexActionController {
  constructor(private readonly useCase: IndexActionUseCase) {}

  async handle({ request, serialize, response, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with('ActionPolicy').authorize('index')

    const isAdmin = authenticatedUser.role === UserRole.ADMIN

    const params: IndexActionOptions = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      includeInactive: isAdmin && request.input('includeInactive') === 'true',
    }

    const result = await this.useCase.execute(params)

    const { data } = await serialize(ActionTransformer.transform(result.data))

    return response.ok({
      data,
      meta: result.meta,
    })
  }
}
```

- [ ] **Step 6: Write and run the functional test**

Create `tests/functional/actions/infrastructure/http/index-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/actions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should exclude inactive actions by default', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    await ActionModel.create({
      id: randomUUID(),
      code: 'ACTIVE_ONE',
      name: 'Active',
      slug: 'active',
      description: null,
      isActive: true,
    })
    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_ONE',
      name: 'Inactive',
      slug: 'inactive',
      description: null,
      isActive: false,
    })

    const response = await client.get('/api/v1/actions').header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.include(codes, 'ACTIVE_ONE')
    assert.notInclude(codes, 'INACTIVE_ONE')
  })

  test('should ignore includeInactive for a non-admin user', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_TWO',
      name: 'Inactive',
      slug: 'inactive-two',
      description: null,
      isActive: false,
    })

    const response = await client
      .get('/api/v1/actions?includeInactive=true')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.notInclude(codes, 'INACTIVE_TWO')
  })

  test('should include inactive actions for an admin requesting includeInactive', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_THREE',
      name: 'Inactive',
      slug: 'inactive-three',
      description: null,
      isActive: false,
    })

    const response = await client
      .get('/api/v1/actions?includeInactive=true')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.include(codes, 'INACTIVE_THREE')
  })
})
```

Run: `node ace test --files="tests/functional/actions/infrastructure/http/index-action.spec.ts"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/modules/actions/application/usecases/index-action.use-case.ts app/modules/actions/infrastructure/http/controllers/index-action.controller.ts tests/unit/actions/application/usecases/index-action.spec.ts tests/functional/actions/infrastructure/http/index-action.spec.ts
git commit -m "feat(actions): filter inactive actions from index, restrict includeInactive to admins"
```

---

### Task 10: Cross-module — refuser d'assigner une action désactivée à un nouveau `mission_step`

**Files:**
- Create: `app/modules/actions/domain/exceptions/action-not-available.error.ts`
- Modify: `app/modules/missions/application/usecases/add-mission-step.use-case.ts`
- Modify: `app/modules/missions/application/usecases/sync-mission-steps.use-case.ts`
- Modify: `tests/unit/mission/application/add-mission-step.spec.ts`
- Modify: `tests/unit/mission/application/sync-mission-steps.spec.ts`
- Create: `tests/functional/missions/add-step-inactive-action.spec.ts`

**Interfaces:**
- Consumes: `Action.isActive` (Task 3), `ActionRepository.findById` (pre-existing).
- Produces: `ActionNotAvailableError` (409). `AddMissionStepUseCase` now requires `ActionRepository` as a third constructor argument.

- [ ] **Step 1: Write the new domain error**

Create `app/modules/actions/domain/exceptions/action-not-available.error.ts`:

```typescript
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionNotAvailableError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_NOT_AVAILABLE'

  constructor(id: string) {
    super('Action with id ' + id + ' is not available')
    this.name = 'ActionNotAvailableError'
  }
}
```

- [ ] **Step 2: Write the failing unit tests for `AddMissionStepUseCase`**

Replace `tests/unit/mission/application/add-mission-step.spec.ts` with:

```typescript
import { test } from '@japa/runner'
import { AddMissionStepUseCase } from '#app/modules/missions/application/usecases/add-mission-step.use-case'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'

function makeAction(id: string, isActive = true): Action {
  return Action.rehydrate(id, 'MOVE_TO', 'Move to', 'move-to', null, null, isActive)
}

test.group('AddMissionStepUseCase', () => {
  test('doit ajouter une étape à une mission existante dans le repository', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const actionId = '550e8400-e29b-41d4-a716-446655440101'
    actionRepo.actions.push(makeAction(actionId))

    const dto = {
      missionId: mission.id.value,
      actionId,
      parameters: 'test',
    }

    await useCase.execute(dto)

    const updatedMission = await repo.findById(mission.id)

    assert.isNotNull(updatedMission)
    assert.lengthOf(updatedMission!.missionSteps, 1)
    assert.equal(updatedMission!.missionSteps[0].actionId, actionId)
    assert.deepEqual(updatedMission!.missionSteps[0].parameters, 'test')
  })

  test("doit échouer si la mission n'existe pas dans le fake repository", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const validButUnknownUuid = '550e8400-e29b-41d4-a716-446655440000'
    const actionId = '550e8400-e29b-41d4-a716-446655440102'
    actionRepo.actions.push(makeAction(actionId))

    const dto = {
      missionId: validButUnknownUuid,
      actionId,
      parameters: '',
    }

    await assert.rejects(async () => {
      await useCase.execute(dto)
    }, MissionNotFoundError)
  })

  test("doit échouer si l'action n'existe pas", async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const unknownActionId = '550e8400-e29b-41d4-a716-446655440103'

    await assert.rejects(
      () =>
        useCase.execute({
          missionId: mission.id.value,
          actionId: unknownActionId,
          parameters: '',
        }),
      ActionNotFoundError
    )
  })

  test('doit refuser une action désactivée', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, new FakeMissionRunRepository(), actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)

    const actionId = '550e8400-e29b-41d4-a716-446655440104'
    actionRepo.actions.push(makeAction(actionId, false))

    await assert.rejects(
      () => useCase.execute({ missionId: mission.id.value, actionId, parameters: '' }),
      ActionNotAvailableError
    )
  })

  test('doit refuser si une mission a un run actif', async ({ assert }) => {
    const repo = new FakeMissionRepository()
    const runRepo = new FakeMissionRunRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new AddMissionStepUseCase(repo, runRepo, actionRepo)

    const mission = Mission.create('Mission Patrouille', 'user-001')
    await repo.save(mission)
    await runRepo.save(MissionRun.start(mission.id, RobotDogId.generate(), []))

    const actionId = '550e8400-e29b-41d4-a716-446655440105'
    actionRepo.actions.push(makeAction(actionId))

    await assert.rejects(
      () => useCase.execute({ missionId: mission.id.value, actionId, parameters: 'test' }),
      InvalidMissionNotEditableError
    )
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node ace test --files="tests/unit/mission/application/add-mission-step.spec.ts"`
Expected: FAIL — `AddMissionStepUseCase` constructor currently takes only two arguments.

- [ ] **Step 4: Implement the guard in `AddMissionStepUseCase`**

Replace `app/modules/missions/application/usecases/add-mission-step.use-case.ts` with:

```typescript
import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'
import { inject } from '@adonisjs/core'

@inject()
export class AddMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository,
    private actionRepository: ActionRepository
  ) {}

  async execute(dto: AddMissionStepDto): Promise<void> {
    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const action = await this.actionRepository.findById(ActionId.fromString(dto.actionId))
    if (!action) {
      throw new ActionNotFoundError(dto.actionId)
    }
    if (!action.isActive) {
      throw new ActionNotAvailableError(dto.actionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.addStep(dto.actionId, dto.parameters, hasActiveRun)

    await this.missionRepository.save(mission)
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/add-mission-step.spec.ts"`
Expected: PASS.

- [ ] **Step 6: Write the failing unit tests for `SyncMissionStepsUseCase`**

In `tests/unit/mission/application/sync-mission-steps.spec.ts`, replace the `makeAction` helper:

```typescript
function makeAction(id: string, schema: ActionParameterSchema | null = null, isActive = true): Action {
  return Action.rehydrate(id, 'MOVE', 'Move', 'move', null, schema, isActive)
}
```

Add `import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'` to the imports.

Append these two tests at the end of the `test.group('SyncMissionStepsUseCase', () => { ... })` body (before the closing `})`):

```typescript
  test('lance ActionNotAvailableError si un nouveau step référence une action désactivée', async ({
    assert,
  }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440005'
    actionRepo.actions.push(makeAction(actionId, null, false))

    const mission = Mission.create('Mission Test', 'user-001')
    await missionRepo.save(mission)

    await assert.rejects(
      async () =>
        useCase.execute({
          missionId: mission.id.value,
          steps: [{ actionId, parameters: '{}' }],
        }),
      ActionNotAvailableError
    )
  })

  test('autorise à conserver un step existant même si son action a été désactivée depuis', async ({
    assert,
  }) => {
    const missionRepo = new FakeMissionRepository()
    const actionRepo = new FakeActionRepository()
    const useCase = new SyncMissionStepsUseCase(
      missionRepo,
      new FakeMissionRunRepository(),
      actionRepo
    )

    const actionId = '550e8400-e29b-41d4-a716-446655440006'
    actionRepo.actions.push(makeAction(actionId, null))

    const mission = Mission.create('Mission Test', 'user-001')
    mission.addStep(actionId, '{}')
    await missionRepo.save(mission)
    const [existingStep] = mission.missionSteps

    // L'action est désactivée après coup, une fois déjà utilisée par ce step
    actionRepo.actions[0] = Action.rehydrate(actionId, 'MOVE', 'Move', 'move', null, null, false)

    const result = await useCase.execute({
      missionId: mission.id.value,
      steps: [{ id: existingStep.id.value, actionId, parameters: '{}' }],
    })

    assert.lengthOf(result.missionSteps, 1)
  })
```

- [ ] **Step 7: Run test to verify the new cases fail**

Run: `node ace test --files="tests/unit/mission/application/sync-mission-steps.spec.ts"`
Expected: FAIL on the new `'lance ActionNotAvailableError...'` test (no such check exists yet); the other new test should already pass since nothing blocks it yet.

- [ ] **Step 8: Implement the guard in `SyncMissionStepsUseCase`**

Replace `app/modules/missions/application/usecases/sync-mission-steps.use-case.ts` with:

```typescript
import { inject } from '@adonisjs/core'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionNotAvailableError } from '#app/modules/actions/domain/exceptions/action-not-available.error'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import type { SyncMissionStepsDto } from '#app/modules/missions/application/dto/sync-mission-steps.dto'

@inject()
export class SyncMissionStepsUseCase {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly actionRepository: ActionRepository
  ) {}

  async execute(dto: SyncMissionStepsDto): Promise<Mission> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    // Valider les paramètres de chaque step contre le schema de l'action.
    // On charge les actions distinctes une seule fois pour éviter N requêtes.
    const distinctActionIds = [...new Set(dto.steps.map((s) => s.actionId).filter(Boolean))]

    for (const actionId of distinctActionIds) {
      const action = await this.actionRepository.findById(ActionId.fromString(actionId))

      if (!action) {
        throw new ActionNotFoundError(actionId)
      }

      const stepsForAction = dto.steps.filter((s) => s.actionId === actionId)
      const hasNewStep = stepsForAction.some((s) => !s.id)

      if (hasNewStep && !action.isActive) {
        throw new ActionNotAvailableError(actionId)
      }

      // Valider tous les steps qui utilisent cette action
      for (const step of stepsForAction) {
        action.validateParameters(step.parameters)
      }
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.syncSteps(dto.steps, hasActiveRun)
    await this.missionRepository.save(mission)

    return mission
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `node ace test --files="tests/unit/mission/application/sync-mission-steps.spec.ts"`
Expected: PASS (all tests, including the pre-existing ones).

- [ ] **Step 10: Write and run the functional test**

Create `tests/functional/missions/add-step-inactive-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('POST /api/v1/missions/:id/steps — action indisponible', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should reject adding a step referencing a deactivated action', async ({
    client,
    cleanup,
  }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-inactive' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: owner.user.id,
    })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'RETIRED',
      name: 'Retired',
      slug: 'retired',
      description: null,
      isActive: false,
    })

    const response = await client
      .post(`/api/v1/missions/${mission.id}/steps`)
      .header('Authorization', owner.header)
      .json({ actionId: action.id, parameters: '{}' })

    response.assertStatus(409)
  })
})
```

Run: `node ace test --files="tests/functional/missions/add-step-inactive-action.spec.ts"`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add app/modules/actions/domain/exceptions/action-not-available.error.ts app/modules/missions/application/usecases/add-mission-step.use-case.ts app/modules/missions/application/usecases/sync-mission-steps.use-case.ts tests/unit/mission/application/add-mission-step.spec.ts tests/unit/mission/application/sync-mission-steps.spec.ts tests/functional/missions/add-step-inactive-action.spec.ts
git commit -m "feat(missions): reject new mission steps referencing a deactivated action"
```

---

### Task 11: Tests fonctionnels — compléter la couverture `create` et `show`

**Files:**
- Create: `tests/functional/actions/infrastructure/http/create-action.spec.ts`
- Create: `tests/functional/actions/infrastructure/http/show-action.spec.ts`

**Interfaces:**
- Consumes: `ActionModel` (Task 4), `ActionTransformer` output (Task 5).
- Produces: nothing consumed by later tasks — this is the last task, closing the functional-coverage gap identified in the spec for the two endpoints whose behavior wasn't otherwise changed by this plan.

- [ ] **Step 1: Write the functional test for create**

Create `tests/functional/actions/infrastructure/http/create-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('POST /api/v1/actions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new active action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({
        code: 'JUMP',
        name: 'Sauter',
        slug: 'jump',
        description: 'Faire sauter le robot',
      })

    response.assertStatus(201)

    const created = await ActionModel.query().where('code', 'JUMP').firstOrFail()
    assert.equal(created.name, 'Sauter')
    assert.isTrue(created.isActive)
  })

  test('should return 409 when code already exists', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await ActionModel.create({
      id: randomUUID(),
      code: 'JUMP',
      name: 'Sauter',
      slug: 'jump',
      description: null,
      isActive: true,
    })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({ code: 'JUMP', name: 'Autre', slug: 'autre' })

    response.assertStatus(409)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({ code: 'JUMP', name: 'Sauter', slug: 'jump' })

    response.assertStatus(403)
  })
})
```

- [ ] **Step 2: Run the create test**

Run: `node ace test --files="tests/functional/actions/infrastructure/http/create-action.spec.ts"`
Expected: PASS.

- [ ] **Step 3: Write the functional test for show**

Create `tests/functional/actions/infrastructure/http/show-action.spec.ts`:

```typescript
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('GET /api/v1/actions/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return an action by id, including a deactivated one', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: false,
    })

    const response = await client
      .get(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(200)
    assert.equal(response.body().slug, 'bark')
    assert.isFalse(response.body().isActive)
  })

  test('should return 404 when action does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup)

    const response = await client
      .get('/api/v1/actions/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)
  })
})
```

- [ ] **Step 4: Run the show test**

Run: `node ace test --files="tests/functional/actions/infrastructure/http/show-action.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Run the full test suite as a final sanity check**

Run: `node ace test`
Expected: all unit and functional tests PASS (no regressions across the codebase).

- [ ] **Step 6: Commit**

```bash
git add tests/functional/actions/infrastructure/http/create-action.spec.ts tests/functional/actions/infrastructure/http/show-action.spec.ts
git commit -m "test(actions): add functional coverage for create and show endpoints"
```
