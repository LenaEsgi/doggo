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
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'

test.group('StartMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let useCase: StartMissionCommandUseCase

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    useCase = new StartMissionCommandUseCase(fakeRepo, fakeMqtt, missionRepo, runRepo, timeoutQueue)
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

  test('refuse de démarrer si un run actif existe déjà pour ce robot', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, mission.id.value)
    assert.lengthOf(fakeMqtt.calls, 1)

    await assert.rejects(
      () => useCase.execute(dog.id.value, mission.id.value),
      InvalidMissionAlreadyRunningError
    )
    assert.lengthOf(fakeMqtt.calls, 1)
  })

  test('schedule un job de timeout 60s après le run PENDING', async ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const run = await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(timeoutQueue.scheduled, 1)
    assert.equal(timeoutQueue.scheduled[0].runId, run.id.value)
    assert.equal(timeoutQueue.scheduled[0].dogId, dog.id.value)
    assert.equal(timeoutQueue.scheduled[0].delayMs, 60_000)
  })

  test('persiste le run PENDING avant de publier la commande MQTT (irréversible en dernier)', async ({ assert }) => {
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

    assert.deepEqual(callOrder, ['save-run', 'mqtt'])
  })

  test('compense en LAUNCH_FAILED (+ annule le timeout) si la publication MQTT échoue', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    fakeMqtt.shouldFail = true

    await assert.rejects(() => useCase.execute(dog.id.value, mission.id.value))

    // aucun run actif ne subsiste → relance immédiate possible
    const active = await runRepo.findActiveRun(mission.id.value, dog.id.value)
    assert.isNull(active)

    // mais le run persiste avec une trace honnête de l'échec de lancement
    assert.lengthOf(runRepo.runs, 1)
    assert.equal(runRepo.runs[0].status, MissionRunStatus.LAUNCH_FAILED)

    // le timeout armé a été annulé (compensation)
    assert.deepInclude(timeoutQueue.cancelled, runRepo.runs[0].id.value)
  })

  test('compense en LAUNCH_FAILED sans rien publier si l’armement du timeout échoue', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    timeoutQueue.schedule = async () => {
      throw new Error('redis down')
    }

    await assert.rejects(() => useCase.execute(dog.id.value, mission.id.value))

    // le timeout ayant échoué, l'ordre ne doit jamais partir au robot
    assert.lengthOf(fakeMqtt.calls, 0)

    // le run est compensé, aucun run actif ne subsiste
    assert.lengthOf(runRepo.runs, 1)
    assert.equal(runRepo.runs[0].status, MissionRunStatus.LAUNCH_FAILED)
    const active = await runRepo.findActiveRunByRobotDog(dog.id.value)
    assert.isNull(active)
  })
})
