import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/functional/helpers/truncate'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import OwnershipModel from '#users/ownerships/infrastructure/database/models/ownership'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('POST /api/v1/dogs/:id/mission (error details)', (group) => {
  group.each.setup(() => truncateDb())

  test('returns a structured, parseable reason instead of a raw technical message when the robot is offline', async ({
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
      serialNumber: 'SN-START-ERR-001',
      key: 'StartErrDogKey0001',
      name: 'PatrolDog',
      state: RobotDogState.OFFLINE,
      batteryLevel: 90,
    })

    await mission.related('robotDogs').attach([dog.id])
    await OwnershipModel.create({
      userId: auth.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })

    const response = await client
      .post(`/api/v1/dogs/${dog.id}/mission`)
      .header('Authorization', auth.header)
      .json({ missionId: mission.id })

    response.assertStatus(400)
    const body = response.body()
    assert.equal(body.error, 'INVALID_DOG_STATE')
    assert.deepEqual(body.details, { reason: 'OFFLINE', currentState: 'OFFLINE' })
  })
})
