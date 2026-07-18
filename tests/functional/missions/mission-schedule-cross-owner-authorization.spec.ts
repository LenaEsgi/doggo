import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'

test.group('DELETE /api/v1/missions/:missionId/schedules/:scheduleId cross-owner authorization', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return 404 when the schedule belongs to a different mission owned by another user', async ({
    client,
    assert,
    cleanup,
  }) => {
    const authA = await authenticateAs(cleanup, { firebaseUid: 'user-a' })

    const missionA = await MissionModel.create({
      id: randomUUID(),
      name: 'Mission A',
      userId: authA.user.id,
    })

    const dogA = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-CROSS-OWNER-001',
      key: 'CrossOwnerDogKeyAAA1',
      name: 'DogA',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    await missionA.related('robotDogs').attach([dogA.id])

    const scheduleRepository = new MissionScheduleRepositoryImplementation()
    const scheduleFromMissionA = MissionSchedule.create(
      MissionId.fromString(missionA.id),
      RobotDogId.fromString(dogA.id),
      [1, 3],
      9,
      30
    )
    await scheduleRepository.save(scheduleFromMissionA)

    const authB = await authenticateAs(cleanup, { firebaseUid: 'user-b' })

    const missionB = await MissionModel.create({
      id: randomUUID(),
      name: 'Mission B',
      userId: authB.user.id,
    })

    const response = await client
      .delete(`/api/v1/missions/${missionB.id}/schedules/${scheduleFromMissionA.id.value}`)
      .header('Authorization', authB.header)

    response.assertStatus(404)

    const stillThere = await scheduleRepository.findById(
      MissionScheduleId.fromString(scheduleFromMissionA.id.value)
    )
    assert.isNotNull(stillThere)
    assert.equal(stillThere?.missionId.value, missionA.id)
  })
})
