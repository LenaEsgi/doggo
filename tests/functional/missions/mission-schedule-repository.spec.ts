import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('MissionScheduleRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('round-trips days of week through the native postgres array column', async ({
    assert,
  }) => {
    const repo = new MissionScheduleRepositoryImplementation()

    const user = await UserModel.create({
      firebaseUid: 'firebase-uid-mission-schedule',
      firstname: 'Test',
      lastname: 'User',
      email: 'mission-schedule@example.com',
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-MISSION-SCHEDULE-001',
      key: 'MissionScheduleDogKey123',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: user.id,
    })

    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [4, 2],
      16,
      30
    )

    await repo.save(schedule)

    const found = await repo.findById(schedule.id)
    assert.isNotNull(found)
    assert.deepEqual(found?.daysOfWeek, [2, 4])
    assert.equal(found?.hour, 16)
    assert.equal(found?.minute, 30)
    assert.isTrue(found?.enabled)

    const byMission = await repo.findByMission(mission.id)
    assert.lengthOf(byMission, 1)

    await repo.delete(schedule.id)
    assert.isNull(await repo.findById(schedule.id))
  })

  test('findEnabled excludes disabled schedules from the database', async ({ assert }) => {
    const repo = new MissionScheduleRepositoryImplementation()

    const user = await UserModel.create({
      firebaseUid: 'firebase-uid-mission-schedule-enabled',
      firstname: 'Test',
      lastname: 'User',
      email: 'mission-schedule-enabled@example.com',
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-MISSION-SCHEDULE-002',
      key: 'MissionScheduleDogKey456',
      name: 'PatrolDog2',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol 2',
      userId: user.id,
    })

    const enabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [3],
      9,
      0
    )
    const disabledSchedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [5],
      10,
      0
    )
    disabledSchedule.disable()

    await repo.save(enabledSchedule)
    await repo.save(disabledSchedule)

    const result = await repo.findEnabled()

    assert.lengthOf(result, 1)
    assert.equal(result[0].id.value, enabledSchedule.id.value)
  })
})
