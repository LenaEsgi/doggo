import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import { LucidUnitOfWork } from '#app/modules/share/infrastructure/database/lucid-unit-of-work'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

/**
 * Crée un run RUNNING (avec une step PENDING réelle en base) via le chemin de
 * sauvegarde actuel (sans tx), pour servir de point de départ aux tests de verrou.
 */
async function seedActiveRun() {
  const unique = randomUUID()

  const user = await UserModel.create({
    firebaseUid: `firebase-uid-lock-${unique}`,
    firstname: 'Test',
    lastname: 'User',
    email: `lock-${unique}@example.com`,
    role: UserRole.USER,
  })

  const dog = await RobotDogModel.create({
    id: randomUUID(),
    serialNumber: `SN-LOCK-${unique}`,
    key: 'LockDogRepositoryKey123',
    name: 'LockDog',
    state: RobotDogState.IDLE,
    batteryLevel: 75,
  })

  const mission = await MissionModel.create({
    id: randomUUID(),
    name: 'Lock mission',
    userId: user.id,
  })

  const step = await MissionStepModel.create({
    id: randomUUID(),
    missionId: mission.id,
    sequenceOrder: 1,
    parameters: '{}',
  })

  const repo = new MissionRunRepositoryImplementation()
  const missionId = MissionId.fromString(mission.id)
  const robotDogId = RobotDogId.fromString(dog.id)
  const stepId = MissionStepId.fromString(step.id)

  const run = MissionRun.start(missionId, robotDogId, [stepId])
  run.confirm()
  await repo.save(run)

  return { repo, missionId, robotDogId, stepId, runId: run.id.value }
}

test.group('MissionRunRepositoryImplementation row lock (findActiveRunForUpdate)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a run failed inside uow.run() is persisted terminal and cannot be resurrected', async ({
    assert,
  }) => {
    const { repo, missionId, robotDogId, stepId, runId } = await seedActiveRun()
    const uow = new LucidUnitOfWork()

    await uow.run(async (tx) => {
      const active = await repo.findActiveRunForUpdate(missionId.value, robotDogId.value, tx)
      assert.isNotNull(active)
      active!.failStep(stepId)
      await repo.save(active!, tx)
    })

    const afterCommit = await repo.findActiveRun(missionId.value, robotDogId.value)
    assert.isNull(afterCommit)

    const persisted = await MissionRunModel.find(runId)
    assert.equal(persisted?.status, MissionRunStatus.FAILED)
  })

  test('a concurrent findActiveRunForUpdate blocks until the row-locking transaction commits', async ({
    assert,
  }) => {
    const { repo, missionId, robotDogId, stepId, runId } = await seedActiveRun()
    const uow = new LucidUnitOfWork()

    let releaseT1!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseT1 = resolve
    })
    let signalLockAcquired!: () => void
    const lockAcquired = new Promise<void>((resolve) => {
      signalLockAcquired = resolve
    })

    const t1 = uow.run(async (tx) => {
      const active = await repo.findActiveRunForUpdate(missionId.value, robotDogId.value, tx)
      signalLockAcquired()
      await gate
      active!.failStep(stepId)
      await repo.save(active!, tx)
    })

    // Attend que T1 ait bien exécuté le SELECT ... FOR UPDATE (verrou pris) avant
    // de démarrer T2 : évite toute dépendance au timing pour cette partie.
    await lockAcquired

    let t2Settled = false
    let t2Result: MissionRun | null = null
    const t2 = uow.run(async (tx) => {
      t2Result = await repo.findActiveRunForUpdate(missionId.value, robotDogId.value, tx)
      t2Settled = true
    })

    try {
      // T1 n'a pas relâché son verrou (gate non résolue) : la requête FOR UPDATE de
      // T2 doit nécessairement être encore en attente, quel que soit le temps écoulé.
      await new Promise((resolve) => setTimeout(resolve, 300))
      assert.isFalse(t2Settled, 'T2 must remain blocked on the row lock while T1 has not committed')
    } finally {
      releaseT1()
      // Garde-fou anti-deadlock : borne l'attente sans jamais déterminer le succès du test.
      await Promise.race([
        Promise.allSettled([t1, t2]),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ])
    }

    assert.isTrue(t2Settled, 'T2 must unblock once T1 commits')
    assert.isNull(t2Result, 'T2 must not resurrect a run that became terminal under it')

    const persisted = await MissionRunModel.find(runId)
    assert.equal(persisted?.status, MissionRunStatus.FAILED)
  }).disableTimeout()
})
