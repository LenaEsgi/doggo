import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { SendRobotCommandUseCase } from '#app/modules/robot-communication/application/use-cases/send-robot-command.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import { NoActiveMissionRunError } from '#app/modules/missions/domain/exceptions/no-active-mission-run.error'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('SendRobotCommandUseCase — ordering', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo)
  })

  test('envoie la commande MQTT avant de persister en base', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const callOrder: string[] = []

    const originalSendCommand = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSendCommand(dogId, command, missionId)
    }

    const originalSave = fakeRepo.save.bind(fakeRepo)
    fakeRepo.save = async (d) => {
      callOrder.push('save')
      return originalSave(d)
    }

    await useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION })

    assert.deepEqual(callOrder, ['mqtt', 'save'])
  })

  test('ne persiste pas en base si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)
    fakeMqtt.shouldFail = true

    let saveCalled = false
    fakeRepo.save = async () => {
      saveCalled = true
    }

    await assert.rejects(() => useCase.execute(dog.id.value, { type: RobotCommand.START_SESSION }))

    assert.isFalse(saveCalled)
  })
})

test.group('SendRobotCommandUseCase — validation', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let useCase: SendRobotCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    useCase = new SendRobotCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo)
  })

  test('lève InvalidRobotCommandError pour START_MISSION sans missionId', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION }),
      InvalidRobotCommandError
    )

    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('accepte START_MISSION quand la mission est assignée au robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, {
      type: RobotCommand.START_MISSION,
      missionId: mission.id.value,
    })

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.status, MissionRunStatus.RUNNING)
    assert.lengthOf(run!.runSteps, 1)
  })

  test("refuse START_MISSION si le robot n'est pas assigné à la mission", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    await assert.rejects(
      () =>
        useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION, missionId: mission.id.value }),
      MissionNotAssignedToRobotError
    )
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('STOP_MISSION interrompt le run actif du robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, { type: RobotCommand.START_MISSION, missionId: mission.id.value })
    await useCase.execute(dog.id.value, { type: RobotCommand.STOP_MISSION })

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(run)
  })

  test("refuse STOP_MISSION si le robot n'a aucun run actif", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(
      () => useCase.execute(dog.id.value, { type: RobotCommand.STOP_MISSION }),
      NoActiveMissionRunError
    )
  })
})
