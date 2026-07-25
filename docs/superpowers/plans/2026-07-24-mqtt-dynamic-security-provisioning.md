# Provisioning automatique des comptes MQTT robot (Dynamic Security) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quand un admin crée un robot depuis le back-office, le backend provisionne automatiquement son compte MQTT (username = id du robot, password généré aléatoirement) sur le broker via le plugin Mosquitto **Dynamic Security**, sans plus jamais nécessiter d'accès serveur / `mosquitto_passwd` manuel — et annule proprement la création (DB + broker) si le provisioning échoue.

**Architecture:**
Le robot est d'abord créé en base (source de vérité, réversible par un simple delete), puis le backend appelle le broker MQTT — déjà connecté en tant que `doggo-backend` — via le protocole de contrôle du plugin Dynamic Security (topic `$CONTROL/dynamic-security/v1`) pour créer un compte `createClient` avec le rôle `robot` (ACL à motif `robot/%u/#`, déjà utilisée aujourd'hui en statique). Si cet appel échoue ou time-out, le robot est supprimé de la base (rollback) et l'erreur remonte au contrôleur HTTP → réponse `502` affichée à l'admin dans le modal de création existant (pas de nouveau canal de notification : c'est l'admin qui a lancé l'action qui doit voir l'échec, et le pattern d'affichage d'erreur existe déjà côté frontend). En cas de succès, le mot de passe en clair est renvoyé **une seule fois** dans la réponse HTTP de création (jamais persisté en base — le plugin Dynamic Security est la seule source de vérité du mot de passe, stocké hashé côté broker) pour que l'admin le flashe dans le firmware.

**Tech Stack:** AdonisJS 6 (backend), `mqtt` (mqtt.js) déjà utilisé pour le client MQTT, Mosquitto 2.x + plugin `mosquitto_dynamic_security` (déjà présent dans l'image officielle `eclipse-mosquitto:2`), Vue 3 + Vitest (frontend), Japa (tests backend).

## Global Constraints

- Ne jamais persister le mot de passe MQTT en clair en base de données — le broker (Dynamic Security) en est l'unique source de vérité (stocké hashé côté plugin).
- Le username MQTT d'un robot reste `robotDog.id.value` (UUID), pour rester compatible avec l'ACL à motif existante `pattern readwrite robot/%u/#` (`backend/mosquitto/aclfile:5`).
- Ne jamais laisser en base un robot créé sans compte MQTT fonctionnel : si le provisioning MQTT échoue, la création du robot est annulée (delete DB) — cohérence stricte demandée.
- Ne pas construire un nouveau canal de notification admin (email/broadcast) : aucun pattern de ce type n'existe dans le code, et l'admin qui déclenche l'action reçoit déjà l'erreur via la réponse HTTP + le modal de création (pattern existant, `CreateRobotModal.vue`).
- Tous les tests unitaires nouveaux utilisent des fakes (pas de broker réel). Les tests fonctionnels HTTP qui touchent MQTT dépendent d'un broker réel déjà configuré avec Dynamic Security (comme c'est déjà le cas aujourd'hui pour les tests fonctionnels de `robot-communication` qui se connectent à `MQTT_HOST:MQTT_PORT` défini dans `.env.test`) — voir prérequis du Task 8.
- Commandes de test backend : `node ace test --files="<chemin>"`. Frontend : `npx vitest run <chemin>`.

---

## Avertissement sur la syntaxe exacte `mosquitto_ctrl`

Les Tasks de ce plan couvrent le **code applicatif** (backend + frontend), vérifié précisément contre la codebase actuelle. L'**activation opérationnelle** du plugin Dynamic Security sur un broker (bootstrap de l'admin, création du rôle `robot`, promotion de `doggo-backend`) passe par l'outil CLI `mosquitto_ctrl`, livré dans l'image `eclipse-mosquitto:2`. Sa syntaxe exacte (noms de sous-commandes, ordre des arguments) doit être vérifiée avec `mosquitto_ctrl dynsec --help` dans le conteneur au moment de l'exécution — elle n'est pas garantie caractère pour caractère dans ce document et **doit être validée en dev avant d'être rejouée en prod** (c'est l'objet du fichier `backend/docs/mqtt-dynamic-security-activation.md` livré à côté de ce plan, à tester en dev en premier).

---

### Task 1: Activer le plugin Dynamic Security dans la config Mosquitto (dev + template déploiement)

**Files:**
- Modify: `backend/mosquitto/mosquitto.conf`
- Modify: `backend/deploy/broker/mosquitto/mosquitto.conf`

**Interfaces:**
- Consumes: rien (config statique).
- Produces: un listener Mosquitto qui charge `mosquitto_dynamic_security.so` au lieu de `password_file`/`acl_file`. C'est le prérequis pour toutes les tasks suivantes (le control topic `$CONTROL/dynamic-security/v1` n'existe que si ce plugin est chargé).

- [ ] **Step 1: Modifier `backend/mosquitto/mosquitto.conf`**

Remplacer les lignes `password_file`/`acl_file` du listener 1883 par le chargement du plugin Dynamic Security. Fichier complet attendu :

```
# Listener non chiffré (réseau interne / dev uniquement)
listener 1883
allow_anonymous false

# Dynamic Security : remplace password_file/acl_file. L'état des comptes/rôles est
# persisté dans mosquitto/data/dynamic-security.json (créé au premier démarrage avec
# un compte admin par défaut dont les identifiants sont affichés une seule fois dans
# les logs du conteneur — voir backend/docs/mqtt-dynamic-security-activation.md).
plugin /usr/lib/mosquitto_dynamic_security.so
plugin_opt_config_file /mosquitto/data/dynamic-security.json

# Listener TLS (production) — désactivé tant qu'il n'y a pas de certificats dans mosquitto/certs/.
# Pour l'activer : déposer ca.crt/server.crt/server.key dans mosquitto/certs/ puis décommenter.
# listener 8883
# protocol mqtt
# cafile /mosquitto/certs/ca.crt
# certfile /mosquitto/certs/server.crt
# keyfile /mosquitto/certs/server.key
# require_certificate false

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
```

- [ ] **Step 2: Appliquer le même changement à `backend/deploy/broker/mosquitto/mosquitto.conf`**

Lire d'abord ce fichier (`Read backend/deploy/broker/mosquitto/mosquitto.conf`) et appliquer la même substitution `password_file`/`acl_file` → bloc `plugin`/`plugin_opt_config_file` ci-dessus, en conservant le reste du fichier (TLS, persistence, log) inchangé.

- [ ] **Step 3: Vérifier que `passwordfile` et `aclfile` ne sont plus référencés ailleurs**

```bash
grep -rn "password_file\|acl_file" backend/mosquitto backend/deploy/broker backend/docker-compose.yml backend/deploy/broker/docker-compose.yml
```

Expected: aucune occurrence restante (le montage Docker de `passwordfile`/`aclfile` dans les `docker-compose.yml` peut rester tel quel — les fichiers ne seront simplement plus utilisés par Mosquitto — ou être retiré ; ne pas le retirer dans cette task pour rester focalisé, ce sera nettoyé par l'opérateur lors de l'activation si souhaité).

- [ ] **Step 4: Commit**

```bash
git add backend/mosquitto/mosquitto.conf backend/deploy/broker/mosquitto/mosquitto.conf
git commit -m "feat(mqtt): load Dynamic Security plugin instead of static password/acl files"
```

---

### Task 2: Value object `MqttAccountPassword`

**Files:**
- Create: `backend/app/modules/robot-communication/domain/value-objects/mqtt-account-password.ts`
- Test: `backend/tests/unit/robot-communication/domain/mqtt-account-password.spec.ts`

**Interfaces:**
- Produces: `MqttAccountPassword.generate(): MqttAccountPassword` avec propriété `.value: string`. Consommé par Task 7 (use-case) et Task 5 (provisioner).

- [ ] **Step 1: Write the failing test**

```ts
import { test } from '@japa/runner'
import { MqttAccountPassword } from '#app/modules/robot-communication/domain/value-objects/mqtt-account-password'

test.group('MqttAccountPassword', () => {
  test('should generate a non-empty random string', ({ assert }) => {
    const password = MqttAccountPassword.generate()

    assert.isString(password.value)
    assert.isAbove(password.value.length, 16)
  })

  test('should generate a different value on each call', ({ assert }) => {
    const first = MqttAccountPassword.generate()
    const second = MqttAccountPassword.generate()

    assert.notEqual(first.value, second.value)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ace test --files="tests/unit/robot-communication/domain/mqtt-account-password.spec.ts"`
Expected: FAIL — `Cannot find module '#app/modules/robot-communication/domain/value-objects/mqtt-account-password'`

- [ ] **Step 3: Write minimal implementation**

```ts
import { randomBytes } from 'node:crypto'

export class MqttAccountPassword {
  private constructor(public readonly value: string) {}

  private static readonly BYTE_LENGTH = 24

  public static generate(): MqttAccountPassword {
    return new MqttAccountPassword(randomBytes(MqttAccountPassword.BYTE_LENGTH).toString('base64url'))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ace test --files="tests/unit/robot-communication/domain/mqtt-account-password.spec.ts"`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/modules/robot-communication/domain/value-objects/mqtt-account-password.ts backend/tests/unit/robot-communication/domain/mqtt-account-password.spec.ts
git commit -m "feat(mqtt): add MqttAccountPassword value object"
```

---

### Task 3: Contrat `MqttAccountProvisioner`

**Files:**
- Create: `backend/app/modules/robot-communication/domain/contracts/mqtt-account-provisioner.ts`

**Interfaces:**
- Produces: `abstract class MqttAccountProvisioner { provisionRobotAccount(username: string, password: string): Promise<void>; deprovisionRobotAccount(username: string): Promise<void> }`. Consommé par Task 5 (implémentation), Task 6 (binding IoC), Task 7 et Task 9 (use-cases).

Pas de test dédié : c'est une classe abstraite sans logique (même style que `RobotCommunicationService`, `backend/app/modules/robot-communication/domain/contracts/robot-communication.service.ts:6-8`, non testée isolément).

- [ ] **Step 1: Créer le contrat**

```ts
export abstract class MqttAccountProvisioner {
  abstract provisionRobotAccount(username: string, password: string): Promise<void>
  abstract deprovisionRobotAccount(username: string): Promise<void>
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune nouvelle erreur (le fichier n'est pas encore consommé, donc pas d'erreur possible à ce stade).

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/robot-communication/domain/contracts/mqtt-account-provisioner.ts
git commit -m "feat(mqtt): add MqttAccountProvisioner contract"
```

---

### Task 4: Erreur de domaine `MqttAccountProvisioningFailedError`

**Files:**
- Create: `backend/app/modules/dogs/domain/exceptions/mqtt-account-provisioning-failed.error.ts`

**Interfaces:**
- Consumes: `DomainError` (`backend/app/modules/share/exceptions/domain-error.ts`).
- Produces: `new MqttAccountProvisioningFailedError(robotDogId: string, cause: unknown)`, `httpStatus = 502`, `code = 'MQTT_ACCOUNT_PROVISIONING_FAILED'`. Consommé par Task 7.

- [ ] **Step 1: Créer l'erreur**

Suit exactement le style de `backend/app/modules/dogs/domain/exceptions/robot-dog-serial-number-already-exists.error.ts` :

```ts
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MqttAccountProvisioningFailedError extends DomainError {
  readonly httpStatus = 502
  readonly code = 'MQTT_ACCOUNT_PROVISIONING_FAILED'

  constructor(robotDogId: string, cause: unknown) {
    super(`Failed to provision MQTT account for robot dog ${robotDogId}.`, {
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/dogs/domain/exceptions/mqtt-account-provisioning-failed.error.ts
git commit -m "feat(dogs): add MqttAccountProvisioningFailedError"
```

---

### Task 5: Implémenter le protocole Dynamic Security dans `MqttServiceImplementation`

**Files:**
- Modify: `backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`

**Interfaces:**
- Consumes: `MqttAccountProvisioner` (Task 3), `mqtt.Client` déjà géré par cette classe (`this.client`, ligne 32).
- Produces: `MqttServiceImplementation` implémente désormais aussi `MqttAccountProvisioner`. Consommé par Task 6 (binding IoC).

Cette classe n'a pas de test unitaire aujourd'hui (wrapper direct de `mqtt.js`, non substituable sans refactor plus large — cohérent avec l'absence de spec existante pour ce fichier). La vérification se fait via le test fonctionnel de Task 8 contre un vrai broker.

- [ ] **Step 1: Ajouter la constante de timeout et le state du protocole de contrôle**

Dans `backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts`, modifier la déclaration de classe (ligne 31) et ajouter les champs privés juste après `private client!: MqttClient` (ligne 32) :

```ts
import { type MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'

type DynamicSecurityResponse = {
  responses: { command: string; error?: string }[]
}

export class MqttServiceImplementation implements RobotCommunicationService, MqttAccountProvisioner {
  private static readonly CONTROL_TOPIC = '$CONTROL/dynamic-security/v1'
  private static readonly CONTROL_RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'
  private static readonly CONTROL_TIMEOUT_MS = 5000

  private client!: MqttClient
  private controlMutex: Promise<void> = Promise.resolve()
  private pendingControlRequest: {
    resolve: (response: DynamicSecurityResponse) => void
    reject: (error: Error) => void
  } | null = null
```

- [ ] **Step 2: S'abonner au topic de réponse dans `connect()`**

Ajouter, juste après `await this.client.subscribeAsync('robot/+/error')` (ligne 57) :

```ts
    await this.client.subscribeAsync(MqttServiceImplementation.CONTROL_RESPONSE_TOPIC)
```

- [ ] **Step 3: Router les messages de contrôle en tête de `handleMessage`**

Modifier le début de `handleMessage` (lignes 94-98) pour intercepter le topic de contrôle avant la logique `robot/${dogId}/...` :

```ts
  private async handleMessage(topic: string, rawPayload: Buffer): Promise<void> {
    if (topic === MqttServiceImplementation.CONTROL_RESPONSE_TOPIC) {
      this.handleDynamicSecurityResponse(rawPayload.toString())
      return
    }

    const segments = topic.split('/')
    const dogId = segments[1]

    if (!dogId) return

    const raw = rawPayload.toString()
```

- [ ] **Step 4: Implémenter le mutex, l'envoi de commande et le routage de réponse**

Ajouter ces méthodes privées et publiques, par exemple juste après `sendCommand` (après la ligne 92, avant `handleMessage`) :

```ts
  async provisionRobotAccount(username: string, password: string): Promise<void> {
    await this.sendDynamicSecurityCommand({
      command: 'createClient',
      username,
      password,
      roles: [{ rolename: 'robot' }],
    })
    logger.info({ username }, 'MqttService: robot MQTT account provisioned')
  }

  async deprovisionRobotAccount(username: string): Promise<void> {
    await this.sendDynamicSecurityCommand({ command: 'deleteClient', username })
    logger.info({ username }, 'MqttService: robot MQTT account deprovisioned')
  }

  private async withControlLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.controlMutex.then(fn, fn)
    this.controlMutex = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  private async sendDynamicSecurityCommand(command: Record<string, unknown>): Promise<void> {
    return this.withControlLock(async () => {
      if (!this.client?.connected) {
        throw new Error('MQTT client is not connected')
      }

      const responsePromise = new Promise<DynamicSecurityResponse>((resolve, reject) => {
        this.pendingControlRequest = { resolve, reject }
      })

      const timeout = setTimeout(() => {
        if (this.pendingControlRequest) {
          this.pendingControlRequest.reject(new Error('Dynamic security control command timed out'))
          this.pendingControlRequest = null
        }
      }, MqttServiceImplementation.CONTROL_TIMEOUT_MS)

      try {
        await this.client.publishAsync(
          MqttServiceImplementation.CONTROL_TOPIC,
          JSON.stringify({ commands: [command] }),
          { qos: 1 }
        )

        const response = await responsePromise
        const [result] = response.responses

        if (result?.error) {
          throw new Error(result.error)
        }
      } finally {
        clearTimeout(timeout)
      }
    })
  }

  private handleDynamicSecurityResponse(raw: string): void {
    if (!this.pendingControlRequest) return

    const { resolve, reject } = this.pendingControlRequest
    this.pendingControlRequest = null

    try {
      resolve(JSON.parse(raw) as DynamicSecurityResponse)
    } catch (err) {
      reject(new Error(`Invalid dynamic security response payload: ${String(err)}`))
    }
  }
```

- [ ] **Step 5: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 6: Vérification manuelle contre un broker de dev (Dynamic Security déjà activé via Task 1 + runbook)**

```bash
cd backend
docker compose up -d --force-recreate mosquitto
# suivre backend/docs/mqtt-dynamic-security-activation.md pour bootstrap + rôle "robot"
docker compose restart api   # ou redémarrer le process backend en dev
docker logs robot_dog_mqtt --tail 20   # doit montrer "MqttService: connected to broker" côté backend
```

Expected: pas d'erreur de connexion ; les logs ne montrent aucune erreur `Dynamic security control command timed out` tant qu'aucun appel `provisionRobotAccount` n'a encore été déclenché (ce sera vérifié par le test fonctionnel de Task 8).

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation.ts
git commit -m "feat(mqtt): implement Dynamic Security account provisioning protocol"
```

---

### Task 6: Binder `MqttAccountProvisioner` dans le container IoC

**Files:**
- Modify: `backend/providers/mqtt_provider.ts`

**Interfaces:**
- Consumes: `MqttAccountProvisioner` (Task 3), `MqttServiceImplementation` (Task 5, instance déjà créée en `boot()`).
- Produces: `app.container.make(MqttAccountProvisioner)` résout la même instance singleton que `RobotCommunicationService`. Consommé par Task 7 et Task 9 via `@inject()`.

- [ ] **Step 1: Ajouter le second binding**

Modifier `backend/providers/mqtt_provider.ts` :

```ts
import type { ApplicationService } from '@adonisjs/core/types'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { MqttServiceImplementation } from '#app/modules/robot-communication/infrastructure/mqtt/mqtt.service.implementation'

export default class MqttProvider {
  private mqttService!: MqttServiceImplementation

  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(RobotCommunicationService, () => {
      return this.mqttService
    })
    this.app.container.bind(MqttAccountProvisioner, () => {
      return this.mqttService
    })
  }

  async boot() {
    this.mqttService = new MqttServiceImplementation()
  }

  async ready() {
    await this.mqttService.connect()
  }

  async shutdown() {
    await this.mqttService.disconnect()
  }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add backend/providers/mqtt_provider.ts
git commit -m "feat(mqtt): bind MqttAccountProvisioner in the IoC container"
```

---

### Task 7: Provisioning + rollback dans `CreateRobotDogUseCase`

**Files:**
- Create: `backend/app/modules/dogs/application/DTO/create-robot-dog-result.dto.ts`
- Create: `backend/tests/unit/fakes/fake-mqtt-account-provisioner.ts`
- Modify: `backend/app/modules/dogs/application/usecases/create-robot-dog.use-case.ts`
- Modify: `backend/app/modules/dogs/infrastructure/http/controllers/create-robot-dog.controller.ts`
- Modify: `backend/tests/unit/dogs/application/usecases/create-robot-dog.spec.ts`

**Interfaces:**
- Consumes: `MqttAccountProvisioner` (Task 3), `MqttAccountPassword` (Task 2), `MqttAccountProvisioningFailedError` (Task 4), `RobotDogRepository.delete(id: RobotDogId): Promise<void>` (déjà existant, `backend/app/modules/dogs/domain/contracts/robot-dog.repository.ts:12`).
- Produces: `CreateRobotDogUseCase.execute(dto): Promise<CreateRobotDogResult>` où `CreateRobotDogResult = { robotDog: RobotDog; mqttPassword: string }`. Consommé par le contrôleur (ce Task) et par le frontend via la réponse HTTP `{ id, mqtt: { username, password } }`.

- [ ] **Step 1: Créer le fake `MqttAccountProvisioner`**

```ts
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'

export class FakeMqttAccountProvisioner extends MqttAccountProvisioner {
  public provisionedAccounts: { username: string; password: string }[] = []
  public deprovisionedUsernames: string[] = []
  public shouldFailProvisioning = false

  async provisionRobotAccount(username: string, password: string): Promise<void> {
    if (this.shouldFailProvisioning) {
      throw new Error('dynsec createClient failed: role not found')
    }
    this.provisionedAccounts.push({ username, password })
  }

  async deprovisionRobotAccount(username: string): Promise<void> {
    this.deprovisionedUsernames.push(username)
  }
}
```

- [ ] **Step 2: Écrire les tests unitaires (échouants) pour le use-case**

Remplacer entièrement `backend/tests/unit/dogs/application/usecases/create-robot-dog.spec.ts` :

```ts
import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import { MqttAccountProvisioningFailedError } from '#dogs/domain/exceptions/mqtt-account-provisioning-failed.error'

test.group('CreateRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeProvisioner: FakeMqttAccountProvisioner
  let useCase: CreateRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeProvisioner = new FakeMqttAccountProvisioner()
    useCase = new CreateRobotDogUseCase(fakeRepo, fakeProvisioner)
  })

  test('should create and save a robot dog', async ({ assert }) => {
    const result = await useCase.execute({
      serialNumber: 'SN-001',
      name: 'Rex',
    })

    assert.lengthOf(fakeRepo.storedDogs, 1)

    const savedDog = fakeRepo.storedDogs[0]

    assert.equal(savedDog.serialNumber, 'SN-001')
    assert.equal(savedDog.name, 'Rex')
    assert.equal(savedDog.batteryLevel, 100)
    assert.equal(result.robotDog.id.value, savedDog.id.value)
  })

  test('should throw if serial number already exists', async ({ assert }) => {
    const existingDog = RobotDog.create('SN-001', 'Existing', 90)
    await fakeRepo.save(existingDog)

    await assert.rejects(
      () =>
        useCase.execute({
          serialNumber: 'SN-001',
          name: 'AnotherDog',
        }),
      RobotDogSerialNumberAlreadyExistsError
    )

    assert.lengthOf(fakeRepo.storedDogs, 1)
  })

  test('should provision an MQTT account using the robot id as username', async ({ assert }) => {
    const result = await useCase.execute({
      serialNumber: 'SN-002',
      name: 'Kobe',
    })

    assert.lengthOf(fakeProvisioner.provisionedAccounts, 1)
    assert.equal(fakeProvisioner.provisionedAccounts[0].username, result.robotDog.id.value)
    assert.equal(fakeProvisioner.provisionedAccounts[0].password, result.mqttPassword)
    assert.isAbove(result.mqttPassword.length, 16)
  })

  test('should roll back the robot dog creation when MQTT provisioning fails', async ({ assert }) => {
    fakeProvisioner.shouldFailProvisioning = true

    await assert.rejects(
      () =>
        useCase.execute({
          serialNumber: 'SN-003',
          name: 'Buddy',
        }),
      MqttAccountProvisioningFailedError
    )

    assert.lengthOf(fakeRepo.storedDogs, 0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node ace test --files="tests/unit/dogs/application/usecases/create-robot-dog.spec.ts"`
Expected: FAIL — `CreateRobotDogUseCase` constructor n'accepte qu'un seul argument, `MqttAccountProvisioningFailedError` inexistant tant que Task 4 n'est pas appliquée (si exécuté hors ordre) ou tests 3/4 échouent car la logique de provisioning n'existe pas encore.

- [ ] **Step 4: Créer le DTO de résultat**

```ts
import { type RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'

export class CreateRobotDogResult {
  constructor(
    public readonly robotDog: RobotDog,
    public readonly mqttPassword: string
  ) {}
}
```

- [ ] **Step 5: Implémenter le use-case**

Remplacer entièrement `backend/app/modules/dogs/application/usecases/create-robot-dog.use-case.ts` :

```ts
import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'
import { CreateRobotDogDto } from '#app/modules/dogs/application/DTO/create-robot-dog.dto'
import { CreateRobotDogResult } from '#app/modules/dogs/application/DTO/create-robot-dog-result.dto'
import { inject } from '@adonisjs/core'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import { MqttAccountProvisioningFailedError } from '#dogs/domain/exceptions/mqtt-account-provisioning-failed.error'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { MqttAccountPassword } from '#app/modules/robot-communication/domain/value-objects/mqtt-account-password'
import logger from '@adonisjs/core/services/logger'

@inject()
export class CreateRobotDogUseCase {
  constructor(
    private robotDogRepository: RobotDogRepository,
    private mqttAccountProvisioner: MqttAccountProvisioner
  ) {}

  async execute(dto: CreateRobotDogDto): Promise<CreateRobotDogResult> {
    logger.info('CreateRobotDogUseCase started', {
      serialNumber: dto.serialNumber,
      name: dto.name,
    })

    const existing = await this.robotDogRepository.findBySerialNumber(dto.serialNumber)

    if (existing) {
      logger.warn('Serial number already exists', { serialNumber: dto.serialNumber })
      throw new RobotDogSerialNumberAlreadyExistsError(dto.serialNumber)
    }

    const robotDog = RobotDog.create(dto.serialNumber, dto.name)

    // On persiste d'abord (source de vérité, réversible par un simple delete) puis on
    // provisionne le compte MQTT en dernier. Si le broker échoue/time-out, on annule la
    // création : aucun robot ne doit rester en base sans identifiants MQTT valides.
    await this.robotDogRepository.save(robotDog)

    const mqttPassword = MqttAccountPassword.generate()

    try {
      await this.mqttAccountProvisioner.provisionRobotAccount(robotDog.id.value, mqttPassword.value)
    } catch (error) {
      await this.robotDogRepository.delete(robotDog.id)
      logger.error(
        {
          robotDogId: robotDog.id.value,
          serialNumber: dto.serialNumber,
          reason: error instanceof Error ? error.message : String(error),
        },
        'CreateRobotDogUseCase: MQTT provisioning failed, robot dog creation rolled back'
      )
      throw new MqttAccountProvisioningFailedError(robotDog.id.value, error)
    }

    logger.info('Robot dog successfully created', {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
    })

    return new CreateRobotDogResult(robotDog, mqttPassword.value)
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node ace test --files="tests/unit/dogs/application/usecases/create-robot-dog.spec.ts"`
Expected: PASS (4 tests)

- [ ] **Step 7: Mettre à jour le contrôleur**

Remplacer entièrement `backend/app/modules/dogs/infrastructure/http/controllers/create-robot-dog.controller.ts` :

```ts
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CreateRobotDogValidator } from '#app/modules/dogs/infrastructure/http/validators/create-robot-dog.validator'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class CreateRobotDogController {
  constructor(private readonly createUseCase: CreateRobotDogUseCase) {}

  async handle({ request, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('create')
    const validatedData = await request.validateUsing(CreateRobotDogValidator)
    logger.info('Creating a new RobotDog', {
      serialNumber: validatedData.serialNumber,
      name: validatedData.name,
    })

    const { robotDog, mqttPassword } = await this.createUseCase.execute(validatedData)
    logger.info('RobotDog successfully created', {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
    })

    return response.status(201).json({
      id: robotDog.id.value,
      mqtt: { username: robotDog.id.value, password: mqttPassword },
    })
  }
}
```

- [ ] **Step 8: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 9: Commit**

```bash
git add backend/app/modules/dogs/application/DTO/create-robot-dog-result.dto.ts \
        backend/app/modules/dogs/application/usecases/create-robot-dog.use-case.ts \
        backend/app/modules/dogs/infrastructure/http/controllers/create-robot-dog.controller.ts \
        backend/tests/unit/dogs/application/usecases/create-robot-dog.spec.ts \
        backend/tests/unit/fakes/fake-mqtt-account-provisioner.ts
git commit -m "feat(dogs): provision MQTT account on robot creation, roll back on failure"
```

---

### Task 8: Test fonctionnel HTTP de bout en bout

**Files:**
- Modify: `backend/tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts`

**Interfaces:**
- Consumes: la route réelle `POST /api/v1/dogs`, un broker MQTT réel avec Dynamic Security déjà bootstrapé et le rôle `robot` déjà créé (prérequis d'environnement, pas du code).

**Prérequis avant d'exécuter ce test :** le broker utilisé par `.env.test` (`MQTT_HOST:MQTT_PORT`) doit avoir le plugin Dynamic Security actif avec un rôle `robot` déjà créé et `doggo-backend` promu admin dynsec — suivre `backend/docs/mqtt-dynamic-security-activation.md` sur ce broker avant de lancer la suite. C'est la même contrainte qui existe déjà implicitement pour les autres tests fonctionnels de `robot-communication` qui se connectent à un broker réel.

- [ ] **Step 1: Étendre le test existant**

Modifier `backend/tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts`, dans le test `'should create a new robot dog'`, après `assert.exists(body.id)` :

```ts
    assert.exists(body.mqtt)
    assert.equal(body.mqtt.username, body.id)
    assert.isString(body.mqtt.password)
    assert.isAbove(body.mqtt.password.length, 16)
```

Fichier complet du test group attendu :

```ts
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#app/modules/dogs/infrastructure/database/models/robot-dog'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('POST /api/v1/dogs', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new robot dog', async ({ client, assert, cleanup }) => {
    // create() is admin-only in RobotDogPolicy
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      serialNumber: 'SN-HTTP-001',
      name: 'TestHTTP',
    })

    response.assertStatus(201)

    const body = response.body()
    assert.exists(body.id)
    assert.exists(body.mqtt)
    assert.equal(body.mqtt.username, body.id)
    assert.isString(body.mqtt.password)
    assert.isAbove(body.mqtt.password.length, 16)

    const created = await RobotDogModel.find(body.id)
    assert.exists(created)
    assert.equal(created!.serialNumber, 'SN-HTTP-001')
    assert.equal(created!.name, 'TestHTTP')
    assert.equal(created!.batteryLevel, 100)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client.post('/api/v1/dogs').header('Authorization', auth.header).json({
      serialNumber: 'SN-HTTP-002',
      name: 'ForbiddenHTTP',
    })

    response.assertStatus(403)
  })
})
```

- [ ] **Step 2: Run test**

Run: `node ace test --files="tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts"`
Expected: PASS (2 tests) — si le prérequis broker n'est pas rempli, le premier test échoue avec une erreur `502`/`MQTT_ACCOUNT_PROVISIONING_FAILED` : appliquer `backend/docs/mqtt-dynamic-security-activation.md` sur le broker de test avant de relancer.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/functional/dogs/infrastructure/http/create-robot-dog.spec.ts
git commit -m "test(dogs): assert MQTT credentials are returned on robot creation"
```

---

### Task 9: Déprovisionner le compte MQTT à la suppression d'un robot

**Files:**
- Create: `backend/tests/unit/fakes/fake-mqtt-account-provisioner.ts` (déjà créé au Task 7 — réutilisé, pas de recréation)
- Modify: `backend/app/modules/dogs/application/usecases/destroy-robot-dog.use-case.ts`
- Modify: `backend/tests/unit/dogs/application/usecases/destroy-robot-dog.spec.ts` (existe déjà avec 2 tests, à remplacer entièrement — voir Step 1)

**Interfaces:**
- Consumes: `MqttAccountProvisioner.deprovisionRobotAccount` (Task 3/5).
- Produces: `DestroyRobotDogUseCase.execute` révoque désormais le compte MQTT **avant** de supprimer la ligne DB — cohérence symétrique de la création : si la révocation MQTT échoue, la suppression DB est annulée plutôt que de laisser un compte MQTT actif orphelin (sans robot associé en base), ce qui serait une fuite d'identifiants non traçable.

> Cette task n'a pas été demandée explicitement mais découle directement de la contrainte de sécurité "intouchable" posée en amont : sans elle, supprimer un robot depuis le back-office laisserait ses identifiants MQTT valides indéfiniment sur le broker. Si ce n'est pas dans le périmètre voulu maintenant, cette task peut être sautée sans casser les tasks 1 à 8.

**Note de cohérence avec `dev` :** la version actuelle de `destroy-robot-dog.use-case.ts` sur la branche `dev` (base de cette implémentation) n'utilise pas de helper `findOrThrow` — elle fait un `if (!robotDog) throw ...` manuel. Le test unitaire existant utilise aussi `group.setup` (une seule fois pour tout le groupe) plutôt que `group.each.setup` : comme les nouveaux tests de ce Task ajoutent des scénarios qui laissent délibérément un robot en base (cas d'échec de déprovisioning), il faut passer à `group.each.setup` pour isoler chaque test — sinon les compteurs `storedDogs.length` des tests suivants seraient faussés par les robots laissés par les tests précédents.

- [ ] **Step 1: Lire le test unitaire existant**

```bash
cat backend/tests/unit/dogs/application/usecases/destroy-robot-dog.spec.ts
```

Il contient aujourd'hui 2 tests (delete si le robot existe, `RobotDogNotFoundError` sinon) avec un `group.setup` partagé. Le Step 2 le remplace entièrement.

- [ ] **Step 2: Write the failing test**

```ts
import { test } from '@japa/runner'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMqttAccountProvisioner } from '#tests/unit/fakes/fake-mqtt-account-provisioner'
import { DestroyRobotDogUseCase } from '#dogs/application/usecases/destroy-robot-dog.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'

test.group('DestroyRobotDogUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeProvisioner: FakeMqttAccountProvisioner
  let useCase: DestroyRobotDogUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeProvisioner = new FakeMqttAccountProvisioner()
    useCase = new DestroyRobotDogUseCase(fakeRepo, fakeProvisioner)
  })

  test('should delete a robot dog if it exists', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value })

    const result = await fakeRepo.findById(dog.id)
    assert.isNull(result)
    assert.lengthOf(fakeRepo.storedDogs, 0)
  })

  test('should throw RobotDogNotFoundError if dog does not exist', async ({ assert }) => {
    const nonExistentId = '56a39d4d-b05d-42fb-a402-6782fc66dc3d'

    await assert.rejects(() => useCase.execute({ id: nonExistentId }), RobotDogNotFoundError)
  })

  test('should deprovision the MQTT account before deleting the robot dog', async ({ assert }) => {
    const dog = RobotDog.create('SN-DESTROY-001', 'ToDelete', 80)
    await fakeRepo.save(dog)

    await useCase.execute({ id: dog.id.value })

    assert.deepEqual(fakeProvisioner.deprovisionedUsernames, [dog.id.value])
    assert.lengthOf(fakeRepo.storedDogs, 0)
  })

  test('should not delete the robot dog when MQTT deprovisioning fails', async ({ assert }) => {
    const dog = RobotDog.create('SN-DESTROY-002', 'KeepOnFailure', 80)
    await fakeRepo.save(dog)
    fakeProvisioner.deprovisionRobotAccount = async () => {
      throw new Error('dynsec deleteClient failed')
    }

    await assert.rejects(() => useCase.execute({ id: dog.id.value }))

    assert.lengthOf(fakeRepo.storedDogs, 1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node ace test --files="tests/unit/dogs/application/usecases/destroy-robot-dog.spec.ts"`
Expected: FAIL — `DestroyRobotDogUseCase` n'accepte qu'un seul argument constructeur.

- [ ] **Step 4: Implémenter la révocation dans le use-case**

Remplacer entièrement `backend/app/modules/dogs/application/usecases/destroy-robot-dog.use-case.ts` :

```ts
import { RobotDogRepository } from '#app/modules/dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#app/modules/dogs/domain/value-objects/robot-dog-id'
import { DestroyRobotDogDto } from '#app/modules/dogs/application/DTO/destroy-robot-dog.dto'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { MqttAccountProvisioner } from '#app/modules/robot-communication/domain/contracts/mqtt-account-provisioner'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'

@inject()
export class DestroyRobotDogUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly mqttAccountProvisioner: MqttAccountProvisioner
  ) {}

  async execute(dto: DestroyRobotDogDto): Promise<void> {
    logger.info({ robotDogId: dto.id }, 'DestroyRobotDogUseCase started')

    const id = RobotDogId.fromString(dto.id)

    const robotDog = await this.robotDogRepository.findById(id)

    if (!robotDog) {
      logger.warn({ robotDogId: dto.id }, 'RobotDog not found')
      throw new RobotDogNotFoundError(dto.id)
    }

    // Révoque le compte MQTT AVANT de supprimer la ligne DB : si la révocation échoue, on
    // n'efface pas le robot, sinon ses identifiants MQTT resteraient valides sur le broker
    // sans plus aucune trace en base pour les révoquer plus tard.
    await this.mqttAccountProvisioner.deprovisionRobotAccount(id.value)

    await this.robotDogRepository.delete(id)

    logger.info({ robotDogId: dto.id }, 'DestroyRobotDogUseCase completed successfully')
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node ace test --files="tests/unit/dogs/application/usecases/destroy-robot-dog.spec.ts"`
Expected: PASS (4 tests)

- [ ] **Step 6: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit -p backend/tsconfig.json`
Expected: aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add backend/app/modules/dogs/application/usecases/destroy-robot-dog.use-case.ts \
        backend/tests/unit/dogs/application/usecases/destroy-robot-dog.spec.ts
git commit -m "feat(dogs): deprovision MQTT account before deleting a robot dog"
```

---

### Task 10: Frontend — remonter les identifiants MQTT jusqu'au repository

**Files:**
- Modify: `frontend/src/modules/robots/domain/contracts/IRobotDogRepository.ts`
- Modify: `frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.ts`
- Modify: `frontend/src/modules/robots/application/usecases/CreateRobotUseCase.ts`
- Modify: `frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.spec.ts`

**Interfaces:**
- Consumes: réponse HTTP `{ id: string; mqtt: { username: string; password: string } }` (Task 7).
- Produces: `CreateRobotUseCase.execute(serialNumber, name): Promise<{ id: string; mqttUsername: string; mqttPassword: string }>`. Consommé par Task 11.

- [ ] **Step 1: Étendre le contrat du repository**

Dans `frontend/src/modules/robots/domain/contracts/IRobotDogRepository.ts`, remplacer la ligne `create(serialNumber: string, name: string): Promise<string>` par :

```ts
    create(serialNumber: string, name: string): Promise<{ id: string; mqttUsername: string; mqttPassword: string }>
```

- [ ] **Step 2: Write the failing test**

Ouvrir `frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.spec.ts`, repérer le style existant (mock d'`apiClient`) et ajouter :

```ts
  it('returns the generated MQTT credentials on create', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { id: 'robot-1', mqtt: { username: 'robot-1', password: 'generated-secret' } },
    })

    const repo = new RobotDogHttpRepository()
    const result = await repo.create('SN-001', 'Rex')

    expect(result).toEqual({
      id: 'robot-1',
      mqttUsername: 'robot-1',
      mqttPassword: 'generated-secret',
    })
  })
```

Adapter le nom du mock (`mockedPost`) à celui déjà utilisé dans le fichier — le lire d'abord pour reprendre exactement la convention de mock d'`apiClient.post` en place.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/modules/robots/infrastructure/RobotDogHttpRepository.spec.ts`
Expected: FAIL — la méthode `create` retourne encore juste `data.id`.

- [ ] **Step 4: Implémenter dans le repository**

Dans `frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.ts`, remplacer la méthode `create` (lignes 62-65) :

```ts
  async create(serialNumber: string, name: string): Promise<{ id: string; mqttUsername: string; mqttPassword: string }> {
    const { data } = await apiClient.post<{ id: string; mqtt: { username: string; password: string } }>(
      apiUrl('/dogs'),
      { serialNumber, name }
    )
    return { id: data.id, mqttUsername: data.mqtt.username, mqttPassword: data.mqtt.password }
  }
```

- [ ] **Step 5: Mettre à jour `CreateRobotUseCase`**

Remplacer entièrement `frontend/src/modules/robots/application/usecases/CreateRobotUseCase.ts` :

```ts
import { IRobotDogRepository } from '@/modules/robots/domain/contracts/IRobotDogRepository'

export class CreateRobotUseCase {
    constructor(private readonly robotRepository: IRobotDogRepository) {}

    async execute(serialNumber: string, name: string): Promise<{ id: string; mqttUsername: string; mqttPassword: string }> {
        return this.robotRepository.create(serialNumber, name)
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/modules/robots/infrastructure/RobotDogHttpRepository.spec.ts`
Expected: PASS

- [ ] **Step 7: Vérifier le typage global**

Run: `npx vue-tsc --noEmit`
Expected: aucune erreur (aucun autre appelant de `create`/`CreateRobotUseCase.execute` en dehors de `useAdminRobots.ts`, traité au Task 11).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/modules/robots/domain/contracts/IRobotDogRepository.ts \
        frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.ts \
        frontend/src/modules/robots/infrastructure/RobotDogHttpRepository.spec.ts \
        frontend/src/modules/robots/application/usecases/CreateRobotUseCase.ts
git commit -m "feat(robots): propagate generated MQTT credentials through create()"
```

---

### Task 11: Frontend — exposer les identifiants dans `useAdminRobots`

**Files:**
- Modify: `frontend/src/modules/backoffice/ui/composables/useAdminRobots.ts`
- Modify: `frontend/src/modules/backoffice/ui/composables/useAdminRobots.spec.ts`

**Interfaces:**
- Consumes: `CreateRobotUseCase.execute` (Task 10).
- Produces: nouveau ref `mqttCredentials: Ref<{ mqttUsername: string; mqttPassword: string } | null>`, exposé par le composable. Consommé par Task 12.

- [ ] **Step 1: Write the failing test**

Ajouter dans `frontend/src/modules/backoffice/ui/composables/useAdminRobots.spec.ts` :

```ts
  it('expose les identifiants MQTT générés après une création réussie', async () => {
    executeCreate.mockResolvedValue({ id: 'robot-1', mqttUsername: 'robot-1', mqttPassword: 'generated-secret' })

    const { createRobot, mqttCredentials } = useAdminRobots()
    const result = await createRobot('SN-1', 'Rex')

    expect(result).toBe(true)
    expect(mqttCredentials.value).toEqual({ mqttUsername: 'robot-1', mqttPassword: 'generated-secret' })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/backoffice/ui/composables/useAdminRobots.spec.ts`
Expected: FAIL — `mqttCredentials` n'existe pas encore dans le retour du composable.

- [ ] **Step 3: Implémenter**

Modifier `frontend/src/modules/backoffice/ui/composables/useAdminRobots.ts` :

```ts
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PaginatedResult } from '@/shared/domain/PaginatedResult'
import type { RobotDog } from '@/modules/robots/domain/RobotDog'
import { getAllAdminRobotsUseCase, createRobotUseCase } from '@/di/container'
import { extractErrorMessage } from '@/shared/ui/errors/extractErrorMessage'

export function useAdminRobots(defaultLimit: number = 25) {
  const { t } = useI18n()
  const robots = ref<RobotDog[]>([])
  const meta = ref<PaginatedResult<RobotDog>['meta'] | null>(null)
  const currentPage = ref(1)
  const limit = ref(defaultLimit)
  const search = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isCreating = ref(false)
  const createError = ref<string | null>(null)
  const mqttCredentials = ref<{ mqttUsername: string; mqttPassword: string } | null>(null)

  async function fetchRobots(page: number = 1) {
    if (robots.value.length === 0) isLoading.value = true
    error.value = null
    try {
      const result = await getAllAdminRobotsUseCase.execute(page, limit.value, search.value || undefined)
      robots.value = result.data
      meta.value = result.meta
      currentPage.value = page
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'An error occurred'
    } finally {
      isLoading.value = false
    }
  }

  async function createRobot(serialNumber: string, name: string): Promise<boolean> {
    isCreating.value = true
    createError.value = null
    mqttCredentials.value = null
    try {
      const result = await createRobotUseCase.execute(serialNumber, name)
      mqttCredentials.value = { mqttUsername: result.mqttUsername, mqttPassword: result.mqttPassword }
      await fetchRobots(1)
      return true
    } catch (e: unknown) {
      createError.value = extractErrorMessage(e, 'backoffice.robots.createError', t)
      return false
    } finally {
      isCreating.value = false
    }
  }

  async function changeLimit(newLimit: number) {
    limit.value = newLimit
    await fetchRobots(1)
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  function searchRobots(query: string) {
    search.value = query
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fetchRobots(1), 300)
  }

  onMounted(() => fetchRobots())

  return {
    robots,
    meta,
    currentPage,
    limit,
    search,
    isLoading,
    error,
    isCreating,
    createError,
    mqttCredentials,
    fetchRobots,
    createRobot,
    changeLimit,
    searchRobots,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/modules/backoffice/ui/composables/useAdminRobots.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/backoffice/ui/composables/useAdminRobots.ts \
        frontend/src/modules/backoffice/ui/composables/useAdminRobots.spec.ts
git commit -m "feat(backoffice): expose generated MQTT credentials after robot creation"
```

---

### Task 12: Frontend — modal de révélation unique des identifiants MQTT

**Files:**
- Create: `frontend/src/modules/backoffice/ui/components/MqttCredentialsModal.vue`
- Modify: `frontend/src/modules/backoffice/ui/pages/BackofficeRobotsPage.vue`

**Interfaces:**
- Consumes: `mqttCredentials` (Task 11).
- Produces: composant d'affichage, pas de nouvelle interface consommée ailleurs.

Composant simple sans logique métier testable isolément (affichage + bouton copier, même niveau que le toggle existant dans `BackofficeRobotDetailPage.vue:144-174`) — pas de test unitaire dédié, cohérent avec l'absence de test sur les autres composants de présentation purs du module (`CreateRobotModal.vue` n'a pas de spec).

- [ ] **Step 1: Créer le composant**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  mqttUsername: string
  mqttPassword: string
}>()

const emit = defineEmits<{
  close: []
}>()

const copied = ref<'username' | 'password' | null>(null)

async function copy(field: 'username' | 'password', value: string) {
  await navigator.clipboard.writeText(value)
  copied.value = field
  setTimeout(() => {
    if (copied.value === field) copied.value = null
  }, 1500)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
  >
    <div class="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
      <h2 class="mb-2 text-lg font-semibold text-white">Robot MQTT credentials</h2>
      <p class="mb-5 text-sm text-gray-400">
        Copy these into the robot's firmware now — the password will not be shown again.
      </p>

      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-gray-400">Username</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 truncate rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
            {{ mqttUsername }}
          </code>
          <button
            type="button"
            class="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
            @click="copy('username', mqttUsername)"
          >
            <Check v-if="copied === 'username'" class="h-4 w-4 text-green-400" />
            <Copy v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="mb-6">
        <label class="mb-1 block text-sm font-medium text-gray-400">Password</label>
        <div class="flex items-center gap-2">
          <code class="flex-1 truncate rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
            {{ mqttPassword }}
          </code>
          <button
            type="button"
            class="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
            @click="copy('password', mqttPassword)"
          >
            <Check v-if="copied === 'password'" class="h-4 w-4 text-green-400" />
            <Copy v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-gray-900
                 transition-colors hover:bg-amber-400"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Intégrer dans `BackofficeRobotsPage.vue`**

Lire d'abord `frontend/src/modules/backoffice/ui/pages/BackofficeRobotsPage.vue` en entier pour repérer la fin du template (où `<CreateRobotModal ... />` est monté, ligne ~177) avant d'éditer.

Modifier le `<script setup>` :

```ts
import { ref } from 'vue'
import { Search, Battery, Wifi, WifiOff, Loader2, Dog, Plus } from 'lucide-vue-next'
import AppPagination from '@/shared/ui/components/AppPagination.vue'
import CreateRobotModal from '@/modules/backoffice/ui/components/CreateRobotModal.vue'
import MqttCredentialsModal from '@/modules/backoffice/ui/components/MqttCredentialsModal.vue'
import { useAdminRobots } from '@/modules/backoffice/ui/composables/useAdminRobots'
import { RobotDogState } from '@/modules/robots/domain/enums/RobotDogState'
import router from '@/router'

const {
  robots,
  meta,
  currentPage,
  limit,
  isLoading,
  error,
  isCreating,
  createError,
  mqttCredentials,
  fetchRobots,
  createRobot,
  changeLimit,
  searchRobots,
} = useAdminRobots()

const isCreateModalOpen = ref(false)

async function handleCreate(serialNumber: string, name: string) {
  const ok = await createRobot(serialNumber, name)
  if (ok) isCreateModalOpen.value = false
}

function closeCredentialsModal() {
  mqttCredentials.value = null
}
```

Ajouter, juste après le `<CreateRobotModal .../>` existant dans le template :

```vue
    <MqttCredentialsModal
      :is-open="mqttCredentials !== null"
      :mqtt-username="mqttCredentials?.mqttUsername ?? ''"
      :mqtt-password="mqttCredentials?.mqttPassword ?? ''"
      @close="closeCredentialsModal"
    />
```

- [ ] **Step 3: Vérifier le typage**

Run: `npx vue-tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Vérification manuelle dans le navigateur**

```bash
cd frontend && npm run dev
```

Créer un robot depuis `/backoffice/robots`, vérifier que le modal "Robot MQTT credentials" s'affiche avec le username = id du robot et un mot de passe généré, que les boutons copier fonctionnent, et que le modal de création se ferme correctement en même temps.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/backoffice/ui/components/MqttCredentialsModal.vue \
        frontend/src/modules/backoffice/ui/pages/BackofficeRobotsPage.vue
git commit -m "feat(backoffice): show generated MQTT credentials once after robot creation"
```

---

## Self-Review

**Couverture du besoin exprimé :**
- "Créer le robot en base, récupérer l'ID, puis créer le compte MQTT" → Task 7, séquence explicite `save()` puis `provisionRobotAccount(robotDog.id.value, ...)`.
- "Rollback DB si le provisioning échoue" → Task 7, `catch` → `robotDogRepository.delete(robotDog.id)`.
- "Notifier l'admin de l'échec" → réponse HTTP `502 MQTT_ACCOUNT_PROVISIONING_FAILED` remontée via le pattern d'erreur existant (`createError` dans `CreateRobotModal.vue`), documenté dans les Global Constraints — pas de nouveau canal, choix assumé et explicité.
- "Le backend génère l'AKI/mot de passe et les donne à l'admin" → Task 7 (génération + retour HTTP), Task 10-12 (propagation frontend + affichage one-time).
- "Mosquitto propose bien ce mécanisme" → confirmé et implémenté via le plugin Dynamic Security natif (Task 1 + Task 5), pas de nouveau composant d'infra.
- Cohérence symétrique à la suppression (gap identifié pendant la recherche, pas demandé explicitement) → Task 9, clairement marquée comme optionnelle.

**Placeholders :** aucun — chaque step contient du code complet, des commandes exactes et des résultats attendus concrets.

**Cohérence des types :** `MqttAccountProvisioner.provisionRobotAccount(username, password)` (Task 3) est implémenté à l'identique dans `MqttServiceImplementation` (Task 5), utilisé à l'identique dans `CreateRobotDogUseCase` (Task 7) et dans le fake (Task 7, réutilisé Task 9). `CreateRobotDogResult` (Task 7) expose `robotDog`/`mqttPassword`, consommé par le contrôleur avec ces noms exacts. Le contrat HTTP `{ id, mqtt: { username, password } }` est identique entre le contrôleur (Task 7) et le repository frontend (Task 10).
