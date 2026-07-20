import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionScheduleModel from '#app/modules/missions/infrastructure/database/models/mission-schedule'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionScheduleFiringRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule-firing.repository.implementation'
import { MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

test.group('MissionScheduleFiringRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function createSchedule(): Promise<string> {
    const user = await UserModel.create({
      firebaseUid: `firebase-uid-firing-${randomUUID()}`,
      firstname: 'Test',
      lastname: 'User',
      email: `firing-${randomUUID()}@example.com`,
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-FIRING-${randomUUID().slice(0, 8)}`,
      key: 'FiringRepoDogKey1234',
      name: 'FiringDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Firing Test Mission',
      userId: user.id,
    })

    const schedule = await MissionScheduleModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      daysOfWeek: [4],
      hour: 12,
      minute: 45,
      enabled: true,
    })

    return schedule.id
  }

  test('tryClaim returns true once and false on a repeated claim for the same minute', async ({
    assert,
  }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })

    const first = await repo.tryClaim(scheduleId, firedForMinute)
    const second = await repo.tryClaim(scheduleId, firedForMinute)

    assert.isTrue(first)
    assert.isFalse(second)
  })

  test('tryClaim allows a different minute for the same schedule', async ({ assert }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const minuteOne = DateTime.utc().set({ second: 0, millisecond: 0 })
    const minuteTwo = minuteOne.plus({ minutes: 1 })

    assert.isTrue(await repo.tryClaim(scheduleId, minuteOne))
    assert.isTrue(await repo.tryClaim(scheduleId, minuteTwo))
  })

  test('recordOutcome updates the claimed row with outcome and mission run id', async ({
    assert,
  }) => {
    const repo = new MissionScheduleFiringRepositoryImplementation()
    const scheduleId = await createSchedule()
    const firedForMinute = DateTime.utc().set({ second: 0, millisecond: 0 })

    await repo.tryClaim(scheduleId, firedForMinute)
    await repo.recordOutcome(
      scheduleId,
      firedForMinute,
      MissionScheduleFiringOutcome.ROBOT_BUSY,
      null
    )

    const row = await db
      .from('mission_schedule_firings')
      .where('mission_schedule_id', scheduleId)
      .first()

    assert.equal(row.outcome, MissionScheduleFiringOutcome.ROBOT_BUSY)
    assert.isNull(row.mission_run_id)
  })
})
