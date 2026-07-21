import { test } from '@japa/runner'
import { HandleMissionScheduleDispatchUseCase } from '#app/modules/missions/application/usecases/handle-mission-schedule-dispatch.use-case'
import { StartMissionCommandUseCase } from '#app/modules/robot-communication/application/use-cases/commands/start-mission.use-case'
import { FakeRobotDogRepository } from '#tests/unit/fakes/fake-robot-dog-repository'
import { FakeRobotCommunicationService } from '#tests/unit/fakes/fake-robot-communication-service'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeMissionRunRepository } from '#tests/unit/fakes/fake-mission-run-repository'
import { FakeMissionTimeoutQueue } from '#tests/unit/fakes/fake-mission-timeout-queue'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionScheduleFiringRepository } from '#tests/unit/fakes/fake-mission-schedule-firing-repository'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'
import emitter from '@adonisjs/core/services/emitter'
import MissionScheduleSkippedEvent from '#app/modules/missions/domain/events/mission-schedule-skipped.event'

test.group('HandleMissionScheduleDispatchUseCase', (group) => {
  let dogRepo: FakeRobotDogRepository
  let mqtt: FakeRobotCommunicationService
  let missionRepo: FakeMissionRepository
  let runRepo: FakeMissionRunRepository
  let timeoutQueue: FakeMissionTimeoutQueue
  let actionRepo: FakeActionRepository
  let scheduleRepo: FakeMissionScheduleRepository
  let firingRepo: FakeMissionScheduleFiringRepository
  let startMissionUseCase: StartMissionCommandUseCase
  let useCase: HandleMissionScheduleDispatchUseCase
  let events: ReturnType<typeof emitter.fake>

  group.each.setup(() => {
    dogRepo = new FakeRobotDogRepository()
    mqtt = new FakeRobotCommunicationService()
    missionRepo = new FakeMissionRepository()
    runRepo = new FakeMissionRunRepository()
    timeoutQueue = new FakeMissionTimeoutQueue()
    actionRepo = new FakeActionRepository()
    scheduleRepo = new FakeMissionScheduleRepository()
    firingRepo = new FakeMissionScheduleFiringRepository()
    startMissionUseCase = new StartMissionCommandUseCase(
      dogRepo,
      mqtt,
      missionRepo,
      runRepo,
      timeoutQueue,
      actionRepo
    )
    useCase = new HandleMissionScheduleDispatchUseCase(
      startMissionUseCase,
      scheduleRepo,
      firingRepo,
      missionRepo
    )
    events = emitter.fake()
    return () => emitter.restore()
  })

  test('starts the mission and records DISPATCHED with the run id on success', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-SCHED-001', 'Rex', 80)
    await dogRepo.save(dog)

    const action = Action.create('SIT', 'Assis', 'sit', null, null)
    actionRepo.actions.push(action)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(action.id.value, '{}')
    await missionRepo.save(mission)
    await missionRepo.assignToDog(mission.id.value, dog.id.value)

    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      RobotDogId.fromString(dog.id.value),
      [4],
      12,
      45
    )
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: mission.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(mqtt.calls, 1)
    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.DISPATCHED)
    assert.isNotNull(firingRepo.outcomes[0].missionRunId)
    events.assertEmittedCount(MissionScheduleSkippedEvent, 0)
  })

  test('records ROBOT_BUSY and does not throw when the robot already has an active run', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-SCHED-002', 'Rex', 80)
    await dogRepo.save(dog)

    const action = Action.create('SIT', 'Assis', 'sit', null, null)
    actionRepo.actions.push(action)

    const missionA = Mission.create('Patrol A', 'user-1')
    missionA.addStep(action.id.value, '{}')
    await missionRepo.save(missionA)
    await missionRepo.assignToDog(missionA.id.value, dog.id.value)

    const missionB = Mission.create('Patrol B', 'user-1')
    missionB.addStep(action.id.value, '{}')
    await missionRepo.save(missionB)
    await missionRepo.assignToDog(missionB.id.value, dog.id.value)

    // Robot already busy running missionA
    await startMissionUseCase.execute(dog.id.value, missionA.id.value)

    const schedule = MissionSchedule.create(
      MissionId.fromString(missionB.id.value),
      RobotDogId.fromString(dog.id.value),
      [4],
      12,
      45
    )
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: missionB.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.ROBOT_BUSY)
    assert.isNull(firingRepo.outcomes[0].missionRunId)

    const stillEnabled = await scheduleRepo.findById(schedule.id)
    assert.isTrue(stillEnabled?.enabled)

    events.assertEmitted(
      MissionScheduleSkippedEvent,
      ({ data }) =>
        data.missionScheduleId === schedule.id.value &&
        data.missionId === missionB.id.value &&
        data.robotDogId === dog.id.value &&
        data.missionName === missionB.name
    )
  })

  test('records ERROR and auto-disables the schedule when the robot is no longer assigned to the mission', async ({
    assert,
  }) => {
    const dog = RobotDog.create('SN-SCHED-003', 'Rex', 80)
    await dogRepo.save(dog)

    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)
    // Deliberately NOT assigning dog to mission

    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      RobotDogId.fromString(dog.id.value),
      [4],
      12,
      45
    )
    await scheduleRepo.save(schedule)

    await useCase.execute({
      scheduleId: schedule.id.value,
      missionId: mission.id.value,
      dogId: dog.id.value,
      firedForMinute: '2024-01-04T12:45:00.000Z',
    })

    assert.lengthOf(firingRepo.outcomes, 1)
    assert.equal(firingRepo.outcomes[0].outcome, MissionScheduleFiringOutcome.ERROR)

    const disabled = await scheduleRepo.findById(schedule.id)
    assert.isFalse(disabled?.enabled)
    events.assertEmittedCount(MissionScheduleSkippedEvent, 0)
  })
})
