import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeUnitOfWork } from '#tests/unit/fakes/fake-unit-of-work'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { SweepStaleRobotRunsUseCase } from '#app/modules/robot-communication/application/use-cases/sweep-stale-robot-runs.use-case'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import DogStateChangedEvent from '#dogs/domain/events/dog-state-changed.event'
import MissionAutoInterruptedEvent from '#app/modules/missions/domain/events/mission-auto-interrupted.event'
import robotConfig from '#config/robot'

test.group('SweepStaleRobotRunsUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let runRepo: FakeMissionRunRepository
  let missionRepo: FakeMissionRepository
  let uow: FakeUnitOfWork
  let timeoutQueue: FakeMissionTimeoutQueue
  let communicationService: FakeRobotCommunicationService
  let useCase: SweepStaleRobotRunsUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    runRepo = new FakeMissionRunRepository()
    missionRepo = new FakeMissionRepository()
    uow = new FakeUnitOfWork()
    timeoutQueue = new FakeMissionTimeoutQueue()
    communicationService = new FakeRobotCommunicationService()
    useCase = new SweepStaleRobotRunsUseCase(
      dogRepo,
      communicationService,
      runRepo,
      missionRepo,
      uow,
      timeoutQueue
    )
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('1. un chien muet (heartbeat vieux de 60s) sans run actif passe OFFLINE sans interruption', async ({
    assert,
  }) => {
    const now = new Date()
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.updateHeartbeat(new Date(now.getTime() - 60_000))
    await dogRepo.save(dog)

    await useCase.execute(now)

    const savedDog = await dogRepo.findById(dog.id)
    assert.equal(savedDog!.state, RobotDogState.OFFLINE)

    events.assertEmitted(
      DogStateChangedEvent,
      ({ data }) => data.dogId === dog.id.value && data.state === RobotDogState.OFFLINE
    )
    events.assertEmittedCount(MissionAutoInterruptedEvent, 0)
    assert.lengthOf(timeoutQueue.cancelled, 0)
    assert.lengthOf(communicationService.calls, 0)
  })

  test('2. un run RUNNING dont le robot est muet depuis plus de runStaleGraceMs est interrompu (ROBOT_OFFLINE) sans commande envoyée', async ({
    assert,
  }) => {
    const now = new Date()
    const dog = RobotDog.create('SN-002', 'Fido', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    dog.updateHeartbeat(new Date(now.getTime() - (robotConfig.runStaleGraceMs + 1_000)))
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const run = MissionRun.start(mission.id, dog.id, [mission.missionSteps[0].id])
    run.confirm()
    await runRepo.save(run)

    await useCase.execute(now)

    const savedRun = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(savedRun.status, MissionRunStatus.INTERRUPTED)

    const savedDog = await dogRepo.findById(dog.id)
    assert.equal(savedDog!.state, RobotDogState.OFFLINE)

    assert.lengthOf(communicationService.calls, 0)

    assert.lengthOf(timeoutQueue.cancelled, 1)
    assert.equal(timeoutQueue.cancelled[0], run.id.value)

    events.assertEmitted(
      MissionAutoInterruptedEvent,
      ({ data }) => data.robotDogId === dog.id.value && data.reason === 'ROBOT_OFFLINE'
    )
  })

  test('3. un run RUNNING dont la durée dépasse runMaxDurationMs alors que le robot répond est interrompu (MAX_DURATION) avec un STOP_MISSION best-effort', async ({
    assert,
  }) => {
    const now = new Date()
    const dog = RobotDog.create('SN-003', 'Bolt', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    dog.updateHeartbeat(now)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const freshRun = MissionRun.start(mission.id, dog.id, [mission.missionSteps[0].id])
    freshRun.confirm()
    // On rehydrate avec un startedAt éloigné pour simuler un run qui traîne depuis trop longtemps.
    const run = MissionRun.rehydrate(
      freshRun.id.value,
      mission.id.value,
      dog.id.value,
      MissionRunStatus.RUNNING,
      freshRun.runSteps,
      new Date(now.getTime() - (robotConfig.runMaxDurationMs + 60_000)),
      null
    )
    await runRepo.save(run)

    await useCase.execute(now)

    const savedRun = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(savedRun.status, MissionRunStatus.INTERRUPTED)

    const savedDog = await dogRepo.findById(dog.id)
    assert.equal(savedDog!.state, RobotDogState.IDLE)

    assert.lengthOf(communicationService.calls, 1)
    assert.equal(communicationService.calls[0].dogId, dog.id.value)
    assert.equal(communicationService.calls[0].command, RobotCommand.STOP_MISSION)

    assert.lengthOf(timeoutQueue.cancelled, 1)
    assert.equal(timeoutQueue.cancelled[0], run.id.value)

    events.assertEmitted(
      MissionAutoInterruptedEvent,
      ({ data }) =>
        data.robotDogId === dog.id.value &&
        data.reason === 'MAX_DURATION' &&
        data.missionId === mission.id.value
    )
  })

  test('4. ignore un run PENDING (géré par le timeout dédié) et laisse intact un run RUNNING dont le robot est frais', async ({
    assert,
  }) => {
    const now = new Date()

    const pendingDog = RobotDog.create('SN-004', 'Pending-Dog', 80)
    pendingDog.applyStateFromRobot(RobotDogState.IN_MISSION)
    pendingDog.updateHeartbeat(now)
    await dogRepo.save(pendingDog)
    const pendingMission = Mission.create('Patrol', 'user-1')
    pendingMission.addStep('action-1', 'p1')
    await missionRepo.save(pendingMission)
    const pendingRun = MissionRun.start(pendingMission.id, pendingDog.id, [
      pendingMission.missionSteps[0].id,
    ])
    await runRepo.save(pendingRun)

    const freshDog = RobotDog.create('SN-005', 'Fresh-Dog', 80)
    freshDog.applyStateFromRobot(RobotDogState.IN_MISSION)
    freshDog.updateHeartbeat(now)
    await dogRepo.save(freshDog)
    const freshMission = Mission.create('Patrol', 'user-1')
    freshMission.addStep('action-1', 'p1')
    await missionRepo.save(freshMission)
    const freshRun = MissionRun.start(freshMission.id, freshDog.id, [
      freshMission.missionSteps[0].id,
    ])
    freshRun.confirm()
    await runRepo.save(freshRun)

    await useCase.execute(now)

    const savedPendingRun = runRepo.runs.find((r) => r.id.equals(pendingRun.id))!
    assert.equal(savedPendingRun.status, MissionRunStatus.PENDING)

    const savedFreshRun = runRepo.runs.find((r) => r.id.equals(freshRun.id))!
    assert.equal(savedFreshRun.status, MissionRunStatus.RUNNING)

    assert.lengthOf(timeoutQueue.cancelled, 0)
    assert.lengthOf(communicationService.calls, 0)
    events.assertEmittedCount(MissionAutoInterruptedEvent, 0)

    const savedPendingDog = await dogRepo.findById(pendingDog.id)
    assert.equal(savedPendingDog!.state, RobotDogState.IN_MISSION)
    const savedFreshDog = await dogRepo.findById(freshDog.id)
    assert.equal(savedFreshDog!.state, RobotDogState.IN_MISSION)
  })

  test("(bonus) un STOP_MISSION qui échoue (MAX_DURATION) n'empêche pas l'interruption du run ni le passage du dog en IDLE", async ({
    assert,
  }) => {
    const now = new Date()
    const dog = RobotDog.create('SN-006', 'Max', 80)
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
    dog.updateHeartbeat(now)
    await dogRepo.save(dog)
    communicationService.shouldFail = true

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep('action-1', 'p1')
    await missionRepo.save(mission)

    const freshRun = MissionRun.start(mission.id, dog.id, [mission.missionSteps[0].id])
    freshRun.confirm()
    const run = MissionRun.rehydrate(
      freshRun.id.value,
      mission.id.value,
      dog.id.value,
      MissionRunStatus.RUNNING,
      freshRun.runSteps,
      new Date(now.getTime() - (robotConfig.runMaxDurationMs + 60_000)),
      null
    )
    await runRepo.save(run)

    await assert.doesNotReject(() => useCase.execute(now))

    const savedRun = runRepo.runs.find((r) => r.id.equals(run.id))!
    assert.equal(savedRun.status, MissionRunStatus.INTERRUPTED)

    const savedDog = await dogRepo.findById(dog.id)
    assert.equal(savedDog!.state, RobotDogState.IDLE)

    assert.lengthOf(timeoutQueue.cancelled, 1)
    events.assertEmitted(
      MissionAutoInterruptedEvent,
      ({ data }) => data.robotDogId === dog.id.value && data.reason === 'MAX_DURATION'
    )
  })
})
