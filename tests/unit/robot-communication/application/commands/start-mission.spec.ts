import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import MissionStartedEvent from '#app/modules/missions/domain/events/mission-started.event'
import MissionStartFailedEvent from '#app/modules/missions/domain/events/mission-start-failed.event'
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
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import Action from '#app/modules/actions/domain/action.entity'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { InvalidDogStateError } from '#dogs/domain/exceptions/invalid-dog-state-error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'

test.group('StartMissionCommandUseCase', (group) => {
  let fakeRepo: FakeRobotDogRepository
  let fakeMqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let actionRepo: FakeActionRepository
  let action: Action
  let useCase: StartMissionCommandUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    fakeRepo = new FakeRobotDogRepository()
    fakeMqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    actionRepo = new FakeActionRepository()
    action = Action.create('SIT', 'Assis', 'sit', null, null)
    actionRepo.actions.push(action)
    useCase = new StartMissionCommandUseCase(
      fakeRepo,
      fakeMqtt,
      missionRepo,
      runRepo,
      timeoutQueue,
      actionRepo,
      new MissionFirmwareCompatibilityService(actionRepo)
    )
    events = emitter.fake()
    return () => emitter.restore()
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
    mission.addStep(action.id.value, '{"angle":90}')
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

    events.assertEmitted(MissionStartedEvent)
  })

  test('émet MissionStartFailedEvent (reason ROBOT_OFFLINE) quand le robot est hors ligne, pour historisation dans les alertes', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.markOffline()
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(action.id.value, '{"angle":90}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await assert.rejects(
      () => useCase.execute(dog.id.value, mission.id.value),
      InvalidDogStateError
    )

    assert.lengthOf(fakeMqtt.calls, 0)
    events.assertEmitted(
      MissionStartFailedEvent,
      ({ data }) =>
        data.missionId === mission.id.value &&
        data.missionName === 'Patrol' &&
        data.robotDogId === dog.id.value &&
        data.robotDogName === 'Rex' &&
        data.reason === 'ROBOT_OFFLINE'
    )
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
    mission.addStep(action.id.value, '{"angle":90}')
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
    mission.addStep(action.id.value, '{"angle":90}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const run = await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(timeoutQueue.scheduled, 1)
    assert.equal(timeoutQueue.scheduled[0].runId, run.id.value)
    assert.equal(timeoutQueue.scheduled[0].dogId, dog.id.value)
    assert.equal(timeoutQueue.scheduled[0].delayMs, 60_000)
  })

  test('persiste le run PENDING avant de publier la commande MQTT (irréversible en dernier)', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(action.id.value, '{"angle":90}')
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
    mission.addStep(action.id.value, '{"angle":90}')
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
    mission.addStep(action.id.value, '{"angle":90}')
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

  test('transmet le runId et les steps dénormalisés (actionCode + params parsés) au robot', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(action.id.value, '{"angle":90}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const run = await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
    const call = fakeMqtt.calls[0]
    assert.equal(call.runId, run.id.value)
    assert.equal(call.missionId, mission.id.value)
    assert.lengthOf(call.steps!, 1)
    assert.deepEqual(call.steps![0], {
      stepId: mission.missionSteps[0].id.value,
      order: 1,
      actionCode: 'SIT',
      parameters: { angle: 90 },
    })
  })

  test("refuse de lancer si une action de la mission n'existe plus (ActionNotFoundError, aucun artefact)", async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(ActionId.generate().value, '{}') // action valide en forme mais non seedée
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await assert.rejects(() => useCase.execute(dog.id.value, mission.id.value), ActionNotFoundError)

    assert.lengthOf(runRepo.runs, 0) // aucun run créé
    assert.lengthOf(fakeMqtt.calls, 0) // rien publié
    assert.lengthOf(timeoutQueue.scheduled, 0) // aucun timeout armé
  })

  test('refuse de lancer si le firmware du robot ne supporte pas une action de la mission', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    await fakeRepo.save(dog)

    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    actionRepo.actions.push(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    let error: unknown
    try {
      await useCase.execute(dog.id.value, mission.id.value)
    } catch (e) {
      error = e
    }

    assert.instanceOf(error, IncompatibleRobotActionsError)
    assert.equal((error as IncompatibleRobotActionsError).details?.robotFirmwareVersion, '1.0.0')
    assert.deepEqual((error as IncompatibleRobotActionsError).details?.actions, [
      { code: 'BARK', name: 'Aboyer', minFirmwareVersion: '2.0.0' },
    ])

    assert.lengthOf(fakeMqtt.calls, 0)
    assert.lengthOf(runRepo.runs, 0)
    assert.lengthOf(timeoutQueue.scheduled, 0)

    events.assertEmitted(
      MissionStartFailedEvent,
      ({ data }) =>
        data.missionId === mission.id.value &&
        data.robotDogId === dog.id.value &&
        data.reason === 'FIRMWARE_INCOMPATIBLE'
    )
  })

  test('autorise le lancement quand le firmware du robot satisfait toutes les actions', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.updateFirmwareVersion('2.0.0')
    await fakeRepo.save(dog)

    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    actionRepo.actions.push(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    await useCase.execute(dog.id.value, mission.id.value)

    assert.lengthOf(fakeMqtt.calls, 1)
  })
})
