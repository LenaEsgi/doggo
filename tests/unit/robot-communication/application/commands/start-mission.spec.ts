import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

test.group('StartMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let useCase: StartMissionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    useCase = new StartMissionCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo)
  })

  test('exposes RobotCommand.START_MISSION as its command', ({ assert }) => {
    assert.equal(useCase.command, RobotCommand.START_MISSION)
  })

  test('lève InvalidRobotCommandError si missionId absent', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    await assert.rejects(() => useCase.execute(dog.id.value), InvalidRobotCommandError)
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('démarre un run quand la mission est assignée au robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const returned = await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
    assert.equal(fakeMqtt.calls[0].missionId, mission.id.value)
    assert.equal(returned.status, MissionRunStatus.PENDING)
    assert.lengthOf(returned.runSteps, 1)

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNotNull(run)
    assert.equal(run!.id.value, returned.id.value)
  })

  test("refuse si le robot n'est pas assigné à la mission", async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)

    await assert.rejects(
      () => useCase.execute(dog.id.value, mission.id.value),
      MissionNotAssignedToRobotError
    )
    assert.lengthOf(fakeMqtt.calls, 0)
  })

  test('envoie la commande MQTT avant de persister le run', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const callOrder: string[] = []
    const originalSend = fakeMqtt.sendCommand.bind(fakeMqtt)
    fakeMqtt.sendCommand = async (dogId, command, missionId) => {
      callOrder.push('mqtt')
      return originalSend(dogId, command, missionId)
    }
    const originalSave = runRepo.save.bind(runRepo)
    runRepo.save = async (run) => {
      callOrder.push('save-run')
      return originalSave(run)
    }

    await useCase.execute(dog.id.value, mission.id.value)

    assert.deepEqual(callOrder, ['mqtt', 'save-run'])
  })

  test('ne persiste rien si la publication MQTT échoue', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value, mission.id.value))

    const run = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(run)
  })
})
