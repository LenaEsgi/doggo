import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeUnitOfWork } from '#tests/unit/fakes/fake-unit-of-work'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { StopMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/stop-mission.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'

test.group('StopMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let runRepo: FakeMissionRunRepository
  let uow: FakeUnitOfWork
  let timeoutQueue: FakeMissionTimeoutQueue
  let useCase: StopMissionCommandUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    runRepo = new FakeMissionRunRepository()
    uow = new FakeUnitOfWork()
    timeoutQueue = new FakeMissionTimeoutQueue()
    useCase = new StopMissionCommandUseCase(fakeRepo, fakeMqtt, runRepo, uow, timeoutQueue)
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('exposes RobotCommand.STOP_MISSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.STOP_MISSION)
  })

  test('interrompt un run RUNNING : persiste, notifie, sans annuler de timeout', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    run.confirm()
    await runRepo.save(run)

    const returned = await useCase.execute(dog.id.value)

    assert.equal(returned.id.value, dog.id.value)
    assert.equal(returned.state, RobotDogState.IDLE)

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(found)
    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].command, RobotCommand.STOP_MISSION)

    assert.lengthOf(timeoutQueue.cancelled, 0, 'un run déjà RUNNING ne doit pas annuler de timeout')
    events.assertEmitted(DogStateChangedEvent)
  })

  test('interrompt un run PENDING : annule le job timeout associé', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)

    await useCase.execute(dog.id.value)

    assert.deepEqual(timeoutQueue.cancelled, [run.id.value])
  })

  test("refuse si le robot n'a aucun run actif", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(() => useCase.execute(dog.id.value), NoActiveMissionRunError)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('ne persiste rien si la publication MQTT échoue (commande avant persistance)', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    await fakeRepo.save(dog)

    const run = MissionRun.start(MissionId.generate(), dog.id, [MissionStepId.generate()])
    await runRepo.save(run)
    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value))

    const found = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNotNull(found)
    assert.equal(found!.status, 'PENDING')
    assert.lengthOf(
      timeoutQueue.cancelled,
      0,
      'aucune annulation si la commande échoue avant la persistance'
    )
    events.assertNotEmitted(DogStateChangedEvent)
  })
})
