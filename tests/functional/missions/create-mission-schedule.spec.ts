import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import OwnershipModel from '#users/ownerships/infrastructure/database/models/ownership'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('POST /api/v1/missions/:id/schedules', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('allows a dog owner who does not own the mission to schedule it on their dog', async ({
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
      serialNumber: 'SN-CREATE-SCHED-001',
      key: 'CreateSchedDogKey001',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    await mission.related('robotDogs').attach([dog.id])

    const dogOwner = await authenticateAs(cleanup, { firebaseUid: 'dog-owner' })
    await OwnershipModel.create({
      userId: dogOwner.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })

    const response = await client
      .post(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', dogOwner.header)
      .json({
        robotDogId: dog.id,
        daysOfWeek: [2, 4],
        hour: 16,
        minute: 30,
      })

    response.assertStatus(201)
    assert.exists(response.body().id)
  })

  test('rejects a user who owns neither the mission nor the target dog', async ({
    client,
    cleanup,
  }) => {
    const missionOwner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-2' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: missionOwner.user.id,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-CREATE-SCHED-002',
      key: 'CreateSchedDogKey002',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    await mission.related('robotDogs').attach([dog.id])

    const stranger = await authenticateAs(cleanup, { firebaseUid: 'stranger' })

    const response = await client
      .post(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', stranger.header)
      .json({
        robotDogId: dog.id,
        daysOfWeek: [2, 4],
        hour: 16,
        minute: 30,
      })

    response.assertStatus(403)
  })

  test('rejects a dog owner scheduling for a dog they do not own, even if payload targets it', async ({
    client,
    cleanup,
  }) => {
    const missionOwner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-3' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: missionOwner.user.id,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-CREATE-SCHED-003',
      key: 'CreateSchedDogKey003',
      name: 'PatrolDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })

    await mission.related('robotDogs').attach([dog.id])

    const otherDogOwner = await authenticateAs(cleanup, { firebaseUid: 'other-dog-owner' })

    const response = await client
      .post(`/api/v1/missions/${mission.id}/schedules`)
      .header('Authorization', otherDogOwner.header)
      .json({
        robotDogId: dog.id,
        daysOfWeek: [2, 4],
        hour: 16,
        minute: 30,
      })

    response.assertStatus(403)
  })
})
