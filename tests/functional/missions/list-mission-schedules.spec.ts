import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/functional/helpers/truncate'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import OwnershipModel from '#users/ownerships/infrastructure/database/models/ownership'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { MissionScheduleRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-schedule.repository.implementation'
import MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('GET /api/v1/missions/:id/schedules', (group) => {
  group.each.setup(() => truncateDb())

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

  test('allows a dog owner who does not own the mission to view its schedules', async ({
    client,
    assert,
    cleanup,
  }) => {
    const missionOwner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: missionOwner.user.id,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-LIST-SCHED-002',
      key: 'ListSchedulesDogKey2',
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

    const dogOwner = await authenticateAs(cleanup, { firebaseUid: 'dog-owner' })
    await OwnershipModel.create({
      userId: dogOwner.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })

    const response = await client
      .get(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', dogOwner.header)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
  })

  test('rejects a user who owns neither the mission nor a dog it is assigned to', async ({
    client,
    cleanup,
  }) => {
    const missionOwner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-2' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: missionOwner.user.id,
    })

    const stranger = await authenticateAs(cleanup, { firebaseUid: 'stranger' })

    const response = await client
      .get(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', stranger.header)

    response.assertStatus(403)
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
