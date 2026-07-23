import { test } from '@japa/runner'
import { ToggleMissionScheduleUseCase } from '#app/modules/missions/application/usecases/toggle-mission-schedule.use-case'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'
import { FakeMissionScheduleRepository } from '#tests/unit/fakes/fake-mission-schedule-repository'
import { FakeMissionRepository } from '#tests/unit/fakes/fake-mission-repository'
import { FakeRobotDogGateway } from '#tests/unit/fakes/fake-robot-dog-gateway'
import { FakeActionRepository } from '#tests/unit/fakes/fake-action-repository'
import { MissionFirmwareCompatibilityService } from '#app/modules/missions/application/services/mission-firmware-compatibility.service'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import Action from '#app/modules/actions/domain/action.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionScheduleNotFoundError } from '#app/modules/missions/domain/exceptions/mission-schedule-not-found.error'
import { IncompatibleRobotActionsError } from '#app/modules/missions/domain/exceptions/incompatible-robot-actions.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

test.group('ToggleMissionScheduleUseCase', (group) => {
  let scheduleRepo: FakeMissionScheduleRepository
  let missionRepo: FakeMissionRepository
  let dogGateway: FakeRobotDogGateway
  let actionRepo: FakeActionRepository
  let useCase: ToggleMissionScheduleUseCase

  group.each.setup(() => {
    scheduleRepo = new FakeMissionScheduleRepository()
    missionRepo = new FakeMissionRepository()
    dogGateway = new FakeRobotDogGateway()
    actionRepo = new FakeActionRepository()
    useCase = new ToggleMissionScheduleUseCase(
      scheduleRepo,
      missionRepo,
      dogGateway,
      new MissionFirmwareCompatibilityService(actionRepo)
    )
  })

  test('disables an enabled schedule without any compatibility check', async ({ assert }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)
    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      RobotDogId.generate(),
      [4],
      12,
      45
    )
    await scheduleRepo.save(schedule)

    await useCase.execute(new ToggleMissionScheduleDto(schedule.id.value, mission.id.value, false))

    const updated = await scheduleRepo.findById(schedule.id)
    assert.isFalse(updated?.enabled)
  })

  test('re-enables a disabled schedule when the mission has no steps (trivially compatible)', async ({
    assert,
  }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)
    const dogId = RobotDogId.generate()
    dogGateway.addRobot(dogId.value)

    const schedule = MissionSchedule.create(MissionId.fromString(mission.id.value), dogId, [4], 12, 45)
    schedule.disable()
    await scheduleRepo.save(schedule)

    await useCase.execute(new ToggleMissionScheduleDto(schedule.id.value, mission.id.value, true))

    const updated = await scheduleRepo.findById(schedule.id)
    assert.isTrue(updated?.enabled)
  })

  test('rejects re-enabling when the robot firmware no longer supports a mission action', async ({
    assert,
  }) => {
    const bark = Action.create('BARK', 'Aboyer', 'bark', null, null, '2.0.0')
    await actionRepo.save(bark)

    const mission = Mission.create('Patrol', 'user-1')
    mission.addStep(bark.id.value, '{}', false)
    await missionRepo.save(mission)

    const dogId = RobotDogId.generate()
    dogGateway.addRobot(dogId.value, 'Rex', '1.0.0')

    const schedule = MissionSchedule.create(MissionId.fromString(mission.id.value), dogId, [4], 12, 45)
    schedule.disable()
    await scheduleRepo.save(schedule)

    await assert.rejects(
      () => useCase.execute(new ToggleMissionScheduleDto(schedule.id.value, mission.id.value, true)),
      IncompatibleRobotActionsError
    )

    const stillDisabled = await scheduleRepo.findById(schedule.id)
    assert.isFalse(stillDisabled?.enabled)
  })

  test('rejects when the schedule does not exist', async ({ assert }) => {
    await assert.rejects(
      () =>
        useCase.execute(
          new ToggleMissionScheduleDto(
            MissionScheduleId.generate().value,
            MissionId.generate().value,
            true
          )
        ),
      MissionScheduleNotFoundError
    )
  })

  test('rejects when the schedule belongs to a different mission', async ({ assert }) => {
    const mission = Mission.create('Patrol', 'user-1')
    await missionRepo.save(mission)
    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id.value),
      RobotDogId.generate(),
      [4],
      12,
      45
    )
    await scheduleRepo.save(schedule)

    await assert.rejects(
      () =>
        useCase.execute(
          new ToggleMissionScheduleDto(schedule.id.value, MissionId.generate().value, true)
        ),
      MissionScheduleNotFoundError
    )
  })
})
