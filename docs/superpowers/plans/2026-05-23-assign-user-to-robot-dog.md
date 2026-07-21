# Assign User to Robot Dog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une route `POST /users/dogs/assign` permettant à un owner authentifié d'associer un autre utilisateur à un robot dog qu'il possède.

**Architecture:** Le controller valide le payload et délègue le contrôle d'authorization à Bouncer (`RobotDogPolicy.assign`). Le use case vérifie l'existence des entités et l'absence de doublon avant de créer l'ownership via le write repository existant.

**Tech Stack:** AdonisJS 6, TypeScript, VineJS (validation), @adonisjs/bouncer (authorization), Japa (tests)

---

## Fichiers créés / modifiés

| Action   | Fichier |
|----------|---------|
| Modifier | `tests/unit/fakes/fake-ownership-repository.ts` |
| Créer    | `app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error.ts` |
| Créer    | `app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts` |
| Créer    | `tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts` |
| Modifier | `app/modules/dogs/application/policies/robot-dog.policy.ts` |
| Créer    | `app/modules/users/infrastructure/http/validators/assign.user.dog.validator.ts` |
| Créer    | `app/modules/users/infrastructure/http/controllers/assign.user.dog.controller.ts` |
| Créer    | `tests/unit/users/controllers/assign.user.dog.controller.spec.ts` |
| Modifier | `app/exceptions/handler.ts` |
| Modifier | `app/modules/users/infrastructure/http/routes.ts` |

---

## Task 1 : Corriger `FakeOwnershipRepository` — ajouter `isOwner()`

`OwnershipReadRepository` déclare `isOwner()` comme méthode abstraite mais `FakeOwnershipRepository` ne l'implémente pas. Cela cause une erreur TypeScript latente et bloque les tests du use case.

**Files:**
- Modify: `tests/unit/fakes/fake-ownership-repository.ts`

- [ ] **Step 1 : Ajouter la méthode `isOwner()` dans le fake**

Ouvrir `tests/unit/fakes/fake-ownership-repository.ts` et ajouter la méthode après `findActiveUserIdsByRobotDogId` :

```ts
async isOwner(userId: string, robotDogId: string): Promise<boolean> {
  return (this.userToDogs[userId] ?? []).includes(robotDogId)
}
```

- [ ] **Step 2 : Vérifier que les tests existants passent toujours**

```bash
node ace test --files="tests/unit/users/ownership.usecases.spec.ts"
```

Expected : tous les tests PASS, aucune régression.

- [ ] **Step 3 : Commit**

```bash
git add tests/unit/fakes/fake-ownership-repository.ts
git commit -m "fix: implement missing isOwner() in FakeOwnershipRepository"
```

---

## Task 2 : Créer `OwnershipAlreadyExistsError`

**Files:**
- Create: `app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error.ts`

- [ ] **Step 1 : Créer le fichier d'erreur**

```ts
// app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error.ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class OwnershipAlreadyExistsError extends DomainError {
  constructor(userId: string, robotDogId: string) {
    super(`User ${userId} already has an active ownership of robot dog ${robotDogId}`)
    this.name = 'OwnershipAlreadyExistsError'
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error.ts
git commit -m "feat: add OwnershipAlreadyExistsError domain error"
```

---

## Task 3 : Écrire les tests du use case (TDD — ils doivent échouer)

**Files:**
- Create: `tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts`

- [ ] **Step 1 : Créer le fichier de tests**

```ts
// tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts
import { test } from '@japa/runner'
import { AssignUserToRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case'
import { FakeOwnershipRepository } from '#tests/unit/fakes/fake-ownership-repository'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { RobotDogOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/robot-dog-ownership.gateway.implementation'
import { UserOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/user-ownership.gateway.implementation'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'

class FakeUserReadRepository extends UserReadRepository {
  constructor(private readonly users: User[]) {
    super()
  }
  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null
  }
  async findByIds(ids: string[]): Promise<User[]> {
    return this.users.filter((u) => ids.includes(u.id))
  }
  async findByFirebaseUid(uid: string): Promise<User | null> {
    return this.users.find((u) => u.firebaseUid === uid) ?? null
  }
  async findAll(): Promise<User[]> {
    return this.users
  }
}

const CALLER_ID = 'caller-00000000-0000-0000-0000-000000000001'
const TARGET_ID = 'target-00000000-0000-0000-0000-000000000002'
const DOG_ID_PLACEHOLDER = 'will-be-set-after-dog-creation'

test.group('AssignUserToRobotDogUseCase', () => {
  test('creates ownership when caller is owner and target user exists', async ({ assert }) => {
    const caller = User.rehydrate(CALLER_ID, 'fb-caller', 'caller@test.com', 'Caller', 'User', UserRole.USER)
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const ownershipRepo = new FakeOwnershipRepository(
      { [CALLER_ID]: [dog.id.value] },
      { [dog.id.value]: [CALLER_ID] }
    )

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([caller, target])),
      ownershipRepo,
      ownershipRepo
    )

    await useCase.execute(dog.id.value, TARGET_ID)

    const isOwner = await ownershipRepo.isOwner(TARGET_ID, dog.id.value)
    assert.isTrue(isOwner)
  })

  test('throws RobotDogNotFoundError when robot dog does not exist', async ({ assert }) => {
    const caller = User.rehydrate(CALLER_ID, 'fb-caller', 'caller@test.com', 'Caller', 'User', UserRole.USER)
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(new FakeRobotDogRepository()),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([caller, target])),
      new FakeOwnershipRepository(),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute('non-existent-dog-id', TARGET_ID),
      RobotDogNotFoundError
    )
  })

  test('throws InvalidUserNotFoundError when target user does not exist', async ({ assert }) => {
    const dog = RobotDog.create('SN-002', 'Max', 90)
    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([])),
      new FakeOwnershipRepository(),
      new FakeOwnershipRepository()
    )

    await assert.rejects(
      () => useCase.execute(dog.id.value, 'non-existent-user-id'),
      InvalidUserNotFoundError
    )
  })

  test('throws OwnershipAlreadyExistsError when target user is already an owner', async ({ assert }) => {
    const target = User.rehydrate(TARGET_ID, 'fb-target', 'target@test.com', 'Target', 'User', UserRole.USER)
    const dog = RobotDog.create('SN-003', 'Bolt', 70)
    const dogRepo = new FakeRobotDogRepository()
    await dogRepo.save(dog)

    const ownershipRepo = new FakeOwnershipRepository(
      { [TARGET_ID]: [dog.id.value] },
      { [dog.id.value]: [TARGET_ID] }
    )

    const useCase = new AssignUserToRobotDogUseCase(
      new RobotDogOwnershipGatewayImplementation(dogRepo),
      new UserOwnershipGatewayImplementation(new FakeUserReadRepository([target])),
      ownershipRepo,
      ownershipRepo
    )

    await assert.rejects(
      () => useCase.execute(dog.id.value, TARGET_ID),
      OwnershipAlreadyExistsError
    )
  })
})
```

- [ ] **Step 2 : Vérifier que le test échoue (use case n'existe pas encore)**

```bash
node ace test --files="tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts"
```

Expected : erreur de compilation ou FAIL (le use case n'existe pas encore).

---

## Task 4 : Implémenter `AssignUserToRobotDogUseCase`

**Files:**
- Create: `app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts`

- [ ] **Step 1 : Créer le use case**

```ts
// app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class AssignUserToRobotDogUseCase {
  constructor(
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly userGateway: UserOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(robotDogId: string, targetUserId: string): Promise<void> {
    logger.info({ robotDogId, targetUserId }, 'AssignUserToRobotDogUseCase started')

    const robotDogExists = await this.robotDogGateway.existsById(robotDogId)
    if (!robotDogExists) {
      logger.warn({ robotDogId }, 'RobotDog not found in AssignUserToRobotDogUseCase')
      throw new RobotDogNotFoundError(robotDogId)
    }

    const targetUserExists = await this.userGateway.existsById(targetUserId)
    if (!targetUserExists) {
      logger.warn({ targetUserId }, 'Target user not found in AssignUserToRobotDogUseCase')
      throw new InvalidUserNotFoundError(targetUserId)
    }

    const alreadyOwner = await this.ownershipReadRepository.isOwner(targetUserId, robotDogId)
    if (alreadyOwner) {
      logger.warn({ robotDogId, targetUserId }, 'Ownership already exists in AssignUserToRobotDogUseCase')
      throw new OwnershipAlreadyExistsError(targetUserId, robotDogId)
    }

    await this.ownershipWriteRepository.adopt(targetUserId, robotDogId, new Date())

    logger.info({ robotDogId, targetUserId }, 'AssignUserToRobotDogUseCase completed successfully')
  }
}
```

- [ ] **Step 2 : Lancer les tests — ils doivent passer**

```bash
node ace test --files="tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts"
```

Expected : 4 tests PASS.

- [ ] **Step 3 : Commit**

```bash
git add app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts \
        tests/unit/users/assign-user-to-robot-dog.usecase.spec.ts
git commit -m "feat: implement AssignUserToRobotDogUseCase with tests"
```

---

## Task 5 : Ajouter `assign()` dans `RobotDogPolicy`

Le check d'authorization "l'appelant est-il owner du robot dog ?" est géré par Bouncer. On ajoute une méthode `assign` dans la policy existante, qui réutilise exactement la même logique que `update`.

**Files:**
- Modify: `app/modules/dogs/application/policies/robot-dog.policy.ts`

- [ ] **Step 1 : Ajouter la méthode `assign()`**

Ouvrir `app/modules/dogs/application/policies/robot-dog.policy.ts` et ajouter après la méthode `update` :

```ts
async assign(user: User, robotDogId: string): Promise<AuthorizerResponse> {
  return this.ownershipRepository.isOwner(user.id, robotDogId)
}
```

Le fichier complet doit ressembler à :

```ts
// app/modules/dogs/application/policies/robot-dog.policy.ts
import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'

@inject()
export default class RobotDogPolicy extends BasePolicy {
  constructor(private readonly ownershipRepository: OwnershipReadRepository) {
    super()
  }

  before(user: User | null): AuthorizerResponse | void {
    if (user?.role === UserRole.ADMIN) return true
  }

  async update(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }

  async assign(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/modules/dogs/application/policies/robot-dog.policy.ts
git commit -m "feat: add assign() authorization check to RobotDogPolicy"
```

---

## Task 6 : Créer le validator et écrire le test du controller (TDD)

**Files:**
- Create: `app/modules/users/infrastructure/http/validators/assign.user.dog.validator.ts`
- Create: `tests/unit/users/controllers/assign.user.dog.controller.spec.ts`

- [ ] **Step 1 : Créer le validator**

```ts
// app/modules/users/infrastructure/http/validators/assign.user.dog.validator.ts
import vine from '@vinejs/vine'

export const assignUserDogValidator = vine.compile(
  vine.object({
    robotDogId: vine.string().uuid(),
    userId: vine.string().uuid(),
  })
)
```

- [ ] **Step 2 : Créer le test du controller (il doit échouer — controller inexistant)**

```ts
// tests/unit/users/controllers/assign.user.dog.controller.spec.ts
import { test } from '@japa/runner'
import AssignUserDogController from '#users/infrastructure/http/controllers/assign.user.dog.controller'

class FakeAssignUserDogUseCase {
  public calledWith: { robotDogId: string; userId: string } | null = null
  async execute(robotDogId: string, userId: string): Promise<void> {
    this.calledWith = { robotDogId, userId }
  }
}

const ROBOT_DOG_ID = '56a39d4d-b05d-42fb-a402-6782fc66dc3d'
const USER_ID = '7b27cc5b-e591-48f2-85ba-f29f96eb9971'
const CALLER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

test.group('AssignUserDogController', () => {
  test('returns 200 and delegates to use case', async ({ assert }) => {
    const fakeUseCase = new FakeAssignUserDogUseCase()
    const controller = new AssignUserDogController(fakeUseCase as any)
    const out: { status?: number; body?: any } = {}

    await controller.handle({
      request: {
        validateUsing: async () => ({ robotDogId: ROBOT_DOG_ID, userId: USER_ID }),
      },
      response: { ok: (body: any) => ((out.status = 200), (out.body = body)) },
      bouncer: { with: () => ({ authorize: async () => {} }) },
      authenticatedUser: { id: CALLER_ID },
      logger: { info: () => {} },
    } as any)

    assert.equal(out.status, 200)
    assert.equal(out.body.message, 'User assigned to RobotDog successfully')
    assert.deepEqual(fakeUseCase.calledWith, { robotDogId: ROBOT_DOG_ID, userId: USER_ID })
  })
})
```

- [ ] **Step 3 : Vérifier que le test échoue (controller inexistant)**

```bash
node ace test --files="tests/unit/users/controllers/assign.user.dog.controller.spec.ts"
```

Expected : erreur de compilation (module introuvable).

---

## Task 7 : Implémenter le controller

**Files:**
- Create: `app/modules/users/infrastructure/http/controllers/assign.user.dog.controller.ts`

- [ ] **Step 1 : Créer le controller**

```ts
// app/modules/users/infrastructure/http/controllers/assign.user.dog.controller.ts
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AssignUserToRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case'
import { assignUserDogValidator } from '#users/infrastructure/http/validators/assign.user.dog.validator'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class AssignUserDogController {
  constructor(private readonly useCase: AssignUserToRobotDogUseCase) {}

  async handle({ request, response, bouncer, authenticatedUser, logger }: HttpContext): Promise<void> {
    const { robotDogId, userId } = await request.validateUsing(assignUserDogValidator)

    await bouncer.with(RobotDogPolicy).authorize('assign', robotDogId)

    logger.info({ callerId: authenticatedUser.id, robotDogId, userId }, 'AssignUserDogController called')
    await this.useCase.execute(robotDogId, userId)
    logger.info({ callerId: authenticatedUser.id, robotDogId, userId }, 'AssignUserDogController completed successfully')

    response.ok({ message: 'User assigned to RobotDog successfully' })
  }
}
```

- [ ] **Step 2 : Lancer le test controller — il doit passer**

```bash
node ace test --files="tests/unit/users/controllers/assign.user.dog.controller.spec.ts"
```

Expected : 1 test PASS.

- [ ] **Step 3 : Commit**

```bash
git add app/modules/users/infrastructure/http/validators/assign.user.dog.validator.ts \
        app/modules/users/infrastructure/http/controllers/assign.user.dog.controller.ts \
        tests/unit/users/controllers/assign.user.dog.controller.spec.ts
git commit -m "feat: add AssignUserDogController and validator with tests"
```

---

## Task 8 : Mettre à jour le handler d'erreurs et enregistrer la route

**Files:**
- Modify: `app/exceptions/handler.ts`
- Modify: `app/modules/users/infrastructure/http/routes.ts`

- [ ] **Step 1 : Ajouter `OwnershipAlreadyExistsError` dans le handler**

Ouvrir `app/exceptions/handler.ts` et ajouter l'import et le cas :

```ts
// Ajouter cet import avec les autres imports d'erreurs
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
```

Dans la méthode `handle()`, ajouter avant le bloc `if (error instanceof HttpError)` :

```ts
if (error instanceof OwnershipAlreadyExistsError) {
  return ctx.response.status(409).json({
    error: 'OWNERSHIP_ALREADY_EXISTS',
    message: error.message,
  })
}
```

- [ ] **Step 2 : Enregistrer la route**

Ouvrir `app/modules/users/infrastructure/http/routes.ts` et ajouter :

```ts
// Ajouter avec les autres imports de controllers (en haut du fichier)
const AssignUserDogController = () =>
  import('#users/infrastructure/http/controllers/assign.user.dog.controller')
```

Dans le groupe `.prefix('/users')`, ajouter la nouvelle route avec le middleware auth :

```ts
router
  .post('/dogs/assign', [AssignUserDogController, 'handle'])
  .use(middleware.firebaseAuth())
```

Le fichier complet des routes doit ressembler à :

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const IndexUserController = () =>
  import('#users/infrastructure/http/controllers/index.user.controller')
const ShowUserController = () =>
  import('#users/infrastructure/http/controllers/show.user.controller')
const MeUserController = () =>
  import('#users/infrastructure/http/controllers/me.user.controller')
const UpdateUserController = () =>
  import('#users/infrastructure/http/controllers/update.user.controller')
const AdoptUserDogController = () =>
  import('#users/infrastructure/http/controllers/adopt.user.dog.controller')
const AbandonUserDogController = () =>
  import('#users/infrastructure/http/controllers/abandon.user.dog.controller')
const ListRobotDogOwnersController = () =>
  import('#users/infrastructure/http/controllers/list.robot.dog.owners.controller')
const AssignUserDogController = () =>
  import('#users/infrastructure/http/controllers/assign.user.dog.controller')

router
  .group(() => {
    router.get('/', [IndexUserController, 'handle'])
    router.get('/me', [MeUserController, 'handle']).use(middleware.firebaseAuth())
    router.get('/dogs/:id', [ListRobotDogOwnersController, 'handle'])
    router.get('/:id', [ShowUserController, 'handle'])
    router.patch('/:id', [UpdateUserController, 'handle'])
    router.post('/:id/dogs/adopt', [AdoptUserDogController, 'handle'])
    router.post('/:id/dogs/abandon', [AbandonUserDogController, 'handle'])
    router.post('/dogs/assign', [AssignUserDogController, 'handle']).use(middleware.firebaseAuth())
  })
  .prefix('/users')
```

- [ ] **Step 3 : Lancer tous les tests pour vérifier l'absence de régression**

```bash
node ace test
```

Expected : tous les tests PASS.

- [ ] **Step 4 : Commit final**

```bash
git add app/exceptions/handler.ts \
        app/modules/users/infrastructure/http/routes.ts
git commit -m "feat: register POST /users/dogs/assign route and handle OwnershipAlreadyExistsError"
```

---

## Résumé des erreurs et codes HTTP

| Erreur | HTTP | Code JSON |
|--------|------|-----------|
| `RobotDogNotFoundError` | 404 | existant |
| `InvalidUserNotFoundError` | 404 | existant |
| Bouncer `AuthorizationException` (caller non owner) | 403 | géré par AdonisJS |
| `OwnershipAlreadyExistsError` | 409 | `OWNERSHIP_ALREADY_EXISTS` |
