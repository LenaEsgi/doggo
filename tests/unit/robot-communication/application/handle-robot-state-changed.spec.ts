import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { HandleRobotStateChangedUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('HandleRobotStateChangedUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let useCase: HandleRobotStateChangedUseCase

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    useCase = new HandleRobotStateChangedUseCase(dogRepo, runRepo, timeoutQueue)
  })

  test('confirme le run PENDING et annule le job timeout quand robot publie IN_MISSION', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)
    assert.equal(run.status, MissionRunStatus.PENDING)

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updated = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNotNull(updated)
    assert.equal(updated!.status, MissionRunStatus.RUNNING)

    assert.lengthOf(timeoutQueue.cancelled, 1)
    assert.equal(timeoutQueue.cancelled[0], run.id.value)
  })

  test('ne touche pas au run ni à la queue si aucun run PENDING pour ce robot', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    assert.lengthOf(timeoutQueue.cancelled, 0)
  })

  test("n'annule pas le job si l'état reçu n'est pas IN_MISSION", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(dog.id.value, RobotDogState.IDLE)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.equal(found!.status, MissionRunStatus.PENDING)
    assert.lengthOf(timeoutQueue.cancelled, 0)
  })

  test('met à jour le state du dog', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.OFFLINE)

    const updated = await dogRepo.findById(dog.id)
    assert.equal(updated!.state, RobotDogState.OFFLINE)
  })

  test('ignore un state inconnu sans planter', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, 'UNKNOWN_STATE')

    const unchanged = await dogRepo.findById(dog.id)
    assert.equal(unchanged!.state, RobotDogState.IDLE)
  })
})
