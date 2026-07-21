# Dog Assignment Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer un mail à l'utilisateur quand il est assigné à un robot dog, de manière asynchrone (fire-and-forget) via le système d'events AdonisJS.

**Architecture:** `AssignUserToRobotDogUseCase` et `AdoptRobotDogUseCase` émettent un `OwnershipAssignedEvent` via `void emitter.emit()` (non-bloquant). Un listener dans le module `notifications` intercepte l'event, récupère user + dog, et envoie le mail via `@adonisjs/mail` (Resend).

**Tech Stack:** AdonisJS 6 emitter, `@adonisjs/mail` avec transport Resend, Edge templates.

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `app/modules/users/ownerships/domain/events/ownership-assigned.event.ts` | Créer | Classe event typée |
| `app/modules/notifications/application/listeners/dog-assigned.listener.ts` | Créer | Listener qui envoie le mail |
| `app/modules/notifications/infrastructure/mail/dog-assigned.mail.ts` | Créer | Classe mail |
| `resources/views/mails/dog-assigned.edge` | Créer | Template HTML du mail |
| `start/events.ts` | Créer | Câblage event → listener |
| `adonisrc.ts` | Modifier | Ajouter preload `start/events` |
| `app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts` | Modifier | Émettre l'event |
| `app/modules/users/ownerships/application/usecases/adopt-robot-dog.use-case.ts` | Modifier | Émettre l'event |
| `tests/unit/notifications/dog-assigned.listener.spec.ts` | Créer | Test du listener |

---

## Task 1 : Installer @adonisjs/mail

**Files:**
- Modify: `package.json` (auto)
- Modify: `config/mail.ts` (auto-généré)
- Modify: `.env` + `.env.example`

- [ ] **Step 1 : Lancer l'installateur**

```bash
cd /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend
node ace add @adonisjs/mail
```

Quand l'installateur demande le transport, sélectionner **Resend**.

- [ ] **Step 2 : Ajouter la clé API dans les fichiers d'environnement**

Dans `.env` :
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

Dans `.env.example` :
```
RESEND_API_KEY=
```

- [ ] **Step 3 : Vérifier `config/mail.ts` généré**

Le fichier doit ressembler à :
```typescript
import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const mailConfig = defineConfig({
  default: 'resend',
  mailers: {
    resend: transports.resend({
      key: env.get('RESEND_API_KEY'),
      baseUrl: 'https://api.resend.com',
    }),
  },
})

export default mailConfig
```

- [ ] **Step 4 : Vérifier que le projet compile**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune nouvelle erreur.

---

## Task 2 : Définir l'event `OwnershipAssignedEvent`

**Files:**
- Create: `app/modules/users/ownerships/domain/events/ownership-assigned.event.ts`

- [ ] **Step 1 : Créer le répertoire et le fichier**

```bash
mkdir -p /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend/app/modules/users/ownerships/domain/events
```

Créer `app/modules/users/ownerships/domain/events/ownership-assigned.event.ts` :

```typescript
export default class OwnershipAssignedEvent {
  constructor(
    public readonly userId: string,
    public readonly robotDogId: string
  ) {}
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/modules/users/ownerships/domain/events/ownership-assigned.event.ts
git commit -m "feat: add OwnershipAssignedEvent class"
```

---

## Task 3 : Créer le template Edge et la classe mail

**Files:**
- Create: `resources/views/mails/dog-assigned.edge`
- Create: `app/modules/notifications/infrastructure/mail/dog-assigned.mail.ts`

- [ ] **Step 1 : Créer les répertoires**

```bash
mkdir -p /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend/resources/views/mails
mkdir -p /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend/app/modules/notifications/infrastructure/mail
```

- [ ] **Step 2 : Créer le template Edge**

Créer `resources/views/mails/dog-assigned.edge` :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Robot dog assigné</title>
</head>
<body style="font-family: sans-serif; padding: 24px; color: #333;">
  <h2>Bonjour {{ user.firstname }} 👋</h2>
  <p>
    Vous avez été assigné au robot dog <strong>{{ robotDog.name }}</strong>
    (numéro de série : <code>{{ robotDog.serialNumber }}</code>).
  </p>
  <p>Vous pouvez maintenant le contrôler depuis l'application Doggo.</p>
  <br>
  <p style="color: #888; font-size: 12px;">Équipe Doggo</p>
</body>
</html>
```

- [ ] **Step 3 : Créer la classe mail**

Créer `app/modules/notifications/infrastructure/mail/dog-assigned.mail.ts` :

```typescript
import { BaseMail } from '@adonisjs/mail'
import type { User } from '#users/domain/user.entity'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

export default class DogAssignedMail extends BaseMail {
  subject = `Vous avez été assigné au robot dog ${this.robotDog.name}`

  constructor(
    private readonly user: User,
    private readonly robotDog: RobotDog
  ) {
    super()
  }

  prepare() {
    this.message
      .to(this.user.email)
      .htmlView('mails/dog-assigned', {
        user: this.user,
        robotDog: this.robotDog,
      })
  }
}
```

- [ ] **Step 4 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add resources/views/mails/dog-assigned.edge app/modules/notifications/infrastructure/mail/dog-assigned.mail.ts
git commit -m "feat: add DogAssignedMail class and Edge template"
```

---

## Task 4 : Créer le listener et son test

**Files:**
- Create: `app/modules/notifications/application/listeners/dog-assigned.listener.ts`
- Create: `tests/unit/notifications/dog-assigned.listener.spec.ts`

- [ ] **Step 1 : Créer le répertoire**

```bash
mkdir -p /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend/app/modules/notifications/application/listeners
mkdir -p /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend/tests/unit/notifications
```

- [ ] **Step 2 : Écrire le test qui doit échouer**

Créer `tests/unit/notifications/dog-assigned.listener.spec.ts` :

```typescript
import { test } from '@japa/runner'
import { DogAssignedListener } from '#app/modules/notifications/application/listeners/dog-assigned.listener'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import type { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import type { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'

const user = User.rehydrate('u1', 'firebase-u1', 'john@example.com', 'John', 'Doe', UserRole.USER)
const dog = RobotDog.rehydrate('d1', 'SN-001', 'key-abc', 'Rex', 'IDLE' as any, 80, new Date())

class FakeUserGateway implements UserOwnershipGateway {
  async existsById(_id: string) { return true }
  async findByIds(_ids: string[]) { return [user] }
}

class FakeRobotDogGateway implements RobotDogOwnershipGateway {
  async existsById(_id: string) { return true }
  async findBySerialNumber(_sn: string) { return null }
  async findByIds(_ids: string[]) { return [dog] }
}

test.group('DogAssignedListener', () => {
  test('envoie un mail quand user et dog sont trouvés', async ({ assert }) => {
    const sentMails: { to: string; dogName: string }[] = []

    const fakeSend = async (mail: any) => {
      sentMails.push({ to: mail.user.email, dogName: mail.robotDog.name })
    }

    const listener = new DogAssignedListener(
      new FakeUserGateway(),
      new FakeRobotDogGateway(),
      fakeSend as any
    )

    const event = new OwnershipAssignedEvent('u1', 'd1')
    await listener.handle(event)

    assert.lengthOf(sentMails, 1)
    assert.equal(sentMails[0].to, 'john@example.com')
    assert.equal(sentMails[0].dogName, 'Rex')
  })

  test('ne plante pas si user introuvable', async ({ assert }) => {
    class EmptyUserGateway implements UserOwnershipGateway {
      async existsById(_id: string) { return false }
      async findByIds(_ids: string[]) { return [] }
    }

    const listener = new DogAssignedListener(
      new EmptyUserGateway(),
      new FakeRobotDogGateway(),
      async () => { throw new Error('ne doit pas être appelé') }
    )

    await assert.doesNotReject(() =>
      listener.handle(new OwnershipAssignedEvent('u1', 'd1'))
    )
  })
})
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

```bash
cd /Users/arthurmorelon/WebstormProjects/fantom609/doggo/backend
node ace test --files="tests/unit/notifications/dog-assigned.listener.spec.ts" 2>&1 | tail -20
```

Résultat attendu : erreur "Cannot find module" (le listener n'existe pas encore).

- [ ] **Step 4 : Implémenter le listener**

Créer `app/modules/notifications/application/listeners/dog-assigned.listener.ts` :

```typescript
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'
import DogAssignedMail from '#app/modules/notifications/infrastructure/mail/dog-assigned.mail'

@inject()
export class DogAssignedListener {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly sendMail: typeof mail.send = mail.send.bind(mail)
  ) {}

  async handle(event: OwnershipAssignedEvent): Promise<void> {
    logger.info({ userId: event.userId, robotDogId: event.robotDogId }, 'DogAssignedListener started')

    const [users, dogs] = await Promise.all([
      this.userGateway.findByIds([event.userId]),
      this.robotDogGateway.findByIds([event.robotDogId]),
    ])

    const user = users[0]
    const robotDog = dogs[0]

    if (!user || !robotDog) {
      logger.warn(
        { userId: event.userId, robotDogId: event.robotDogId },
        'DogAssignedListener: user or dog not found, skipping mail'
      )
      return
    }

    try {
      await this.sendMail(new DogAssignedMail(user, robotDog))
      logger.info({ to: user.email }, 'DogAssignedListener: mail sent successfully')
    } catch (error) {
      logger.error({ error, userId: event.userId }, 'DogAssignedListener: failed to send mail')
    }
  }
}
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

```bash
node ace test --files="tests/unit/notifications/dog-assigned.listener.spec.ts" 2>&1 | tail -20
```

Résultat attendu : 2 tests passing.

- [ ] **Step 6 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add app/modules/notifications/application/listeners/dog-assigned.listener.ts tests/unit/notifications/dog-assigned.listener.spec.ts
git commit -m "feat: add DogAssignedListener with test"
```

---

## Task 5 : Câbler l'event dans start/events.ts et adonisrc.ts

**Files:**
- Create: `start/events.ts`
- Modify: `adonisrc.ts`

- [ ] **Step 1 : Créer `start/events.ts`**

```typescript
import emitter from '@adonisjs/core/services/emitter'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

const DogAssignedListener = () =>
  import('#app/modules/notifications/application/listeners/dog-assigned.listener').then(
    (m) => m.DogAssignedListener
  )

emitter.on(OwnershipAssignedEvent, [DogAssignedListener])
```

- [ ] **Step 2 : Ajouter le preload dans `adonisrc.ts`**

Remplacer :
```typescript
preloads: [() => import('#start/routes'), () => import('#start/kernel')],
```

Par :
```typescript
preloads: [
  () => import('#start/routes'),
  () => import('#start/kernel'),
  () => import('#start/events'),
],
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add start/events.ts adonisrc.ts
git commit -m "feat: register DogAssignedListener on OwnershipAssignedEvent"
```

---

## Task 6 : Émettre l'event dans AssignUserToRobotDogUseCase

**Files:**
- Modify: `app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts`

- [ ] **Step 1 : Modifier le use case**

```typescript
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

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
      logger.warn(
        { robotDogId, targetUserId },
        'Ownership already exists in AssignUserToRobotDogUseCase'
      )
      throw new OwnershipAlreadyExistsError(targetUserId, robotDogId)
    }

    await this.ownershipWriteRepository.adopt(targetUserId, robotDogId, new Date())

    void emitter.emit(OwnershipAssignedEvent, new OwnershipAssignedEvent(targetUserId, robotDogId))

    logger.info({ robotDogId, targetUserId }, 'AssignUserToRobotDogUseCase completed successfully')
  }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts
git commit -m "feat: emit OwnershipAssignedEvent in AssignUserToRobotDogUseCase"
```

---

## Task 7 : Émettre l'event dans AdoptRobotDogUseCase

**Files:**
- Modify: `app/modules/users/ownerships/application/usecases/adopt-robot-dog.use-case.ts`

- [ ] **Step 1 : Modifier le use case**

```typescript
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

@inject()
export class AdoptRobotDogUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(userId: string, serialNumber: string): Promise<void> {
    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId, serialNumber }, 'User not found in AdoptRobotDogUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const robotDog = await this.robotDogGateway.findBySerialNumber(serialNumber)
    if (!robotDog) {
      logger.warn({ userId, serialNumber }, 'RobotDog not found in AdoptRobotDogUseCase')
      throw new RobotDogNotFoundError(serialNumber)
    }

    await this.ownershipWriteRepository.adopt(userId, robotDog.id.value, new Date())

    void emitter.emit(OwnershipAssignedEvent, new OwnershipAssignedEvent(userId, robotDog.id.value))

    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase completed successfully')
  }
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "user-services.spec"
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Lancer tous les tests existants**

```bash
node ace test 2>&1 | tail -30
```

Résultat attendu : tous les tests passent.

- [ ] **Step 4 : Commit final**

```bash
git add app/modules/users/ownerships/application/usecases/adopt-robot-dog.use-case.ts
git commit -m "feat: emit OwnershipAssignedEvent in AdoptRobotDogUseCase"
```
