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

test.group('GET /api/v1/missions/:id/schedules', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('returns a real JSON array wrapped under "data", not the raw transformer object', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: auth.user.id,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-LIST-SCHED-001',
      key: 'ListSchedulesDogKey1',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    await mission.related('robotDogs').attach([dog.id])

    const scheduleRepository = new MissionScheduleRepositoryImplementation()
    const schedule = MissionSchedule.create(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dog.id),
      [2, 4],
      16,
      30
    )
    await scheduleRepository.save(schedule)

    const response = await client
      .get(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', auth.header)

    response.assertStatus(200)

    const body = response.body()
    // Regression guard: a prior bug returned the transformer's internal Collection
    // instance directly (no `serialize()` call), which is not a real array and made
    // the frontend's `.map()` call throw. `data` must be a genuine JSON array here.
    assert.isTrue(Array.isArray(body.data), 'response.data must be a real array')
    assert.lengthOf(body.data, 1)
    assert.equal(body.data[0].id, schedule.id.value)
    assert.equal(body.data[0].missionId, mission.id)
    assert.equal(body.data[0].robotDogId, dog.id)
    assert.deepEqual(body.data[0].daysOfWeek, [2, 4])
    assert.equal(body.data[0].hour, 16)
    assert.equal(body.data[0].minute, 30)
    assert.equal(body.data[0].enabled, true)
  })

  test('returns an empty array when the mission has no schedules', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol without schedules',
      userId: auth.user.id,
    })

    const response = await client
      .get(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', auth.header)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { data: [] })
  })
})
