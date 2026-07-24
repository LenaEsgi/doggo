import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeUnitOfWork } from '#tests/unit/fakes/fake-unit-of-work'
import { HandleRobotStateChangedUseCase } from '#app/modules/robot-communication/application/use-cases/handle-robot-state-changed.use-case'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

test.group('HandleRobotStateChangedUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let communicationService: FakeRobotCommunicationService
  let uow: FakeUnitOfWork
  let useCase: HandleRobotStateChangedUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    communicationService = new FakeRobotCommunicationService()
    uow = new FakeUnitOfWork()
    useCase = new HandleRobotStateChangedUseCase(
      dogRepo,
      runRepo,
      timeoutQueue,
      communicationService,
      uow
    )
    events = emitter.fake()
    return () => emitter.restore()
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
    assert.lengthOf(communicationService.calls, 0)
  })

  test('mission fantôme : renvoie le chien à IDLE et envoie un STOP correctif si IN_MISSION sans run actif', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updatedDog = await dogRepo.findById(dog.id)
    assert.equal(updatedDog!.state, RobotDogState.IDLE)

    assert.lengthOf(timeoutQueue.cancelled, 0)
    assert.lengthOf(communicationService.calls, 1)
    assert.equal(communicationService.calls[0].dogId, dog.id.value)
    assert.equal(communicationService.calls[0].command, RobotCommand.STOP_MISSION)
  })

  test('mission fantôme : ne plante pas si le STOP correctif échoue (robot injoignable)', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)
    communicationService.shouldFail = true

    await useCase.execute(dog.id.value, RobotDogState.IN_MISSION)

    const updatedDog = await dogRepo.findById(dog.id)
    assert.equal(updatedDog!.state, RobotDogState.IDLE)
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

  test('émet DogStateChangedEvent sur une transition réelle', async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.ERROR)

    events.assertEmittedCount(DogStateChangedEvent, 1)
  })

  test("n'émet pas DogStateChangedEvent en boucle si le robot répète le même state (anti-spam)", async () => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await dogRepo.save(dog)

    await useCase.execute(dog.id.value, RobotDogState.ERROR)
    await useCase.execute(dog.id.value, RobotDogState.ERROR)
    await useCase.execute(dog.id.value, RobotDogState.ERROR)

    events.assertEmittedCount(DogStateChangedEvent, 1)
  })
})
