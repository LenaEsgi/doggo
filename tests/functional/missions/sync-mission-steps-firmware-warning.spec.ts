import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/functional/helpers/truncate'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import OwnershipModel from '#users/ownerships/infrastructure/database/models/ownership'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('PUT /api/v1/missions/:id/steps (firmware warning)', (group) => {
  group.each.setup(() => truncateDb())

  test('inclut firmwareWarnings dans la réponse quand un robot assigné devient incompatible', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      isActive: true,
      minFirmwareVersion: '2.0.0',
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: auth.user.id,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-SYNC-WARN-001',
      key: 'SyncWarnDogKey0001',
      name: 'Rex',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
      firmwareVersion: '1.0.0',
    })

    await mission.related('robotDogs').attach([dog.id])
    await OwnershipModel.create({
      userId: auth.user.id,
      robotDogId: dog.id,
      startDate: DateTime.now(),
      endDate: null,
    })

    const response = await client
      .put(`/api/v1/missions/${mission.id}/steps`)
      .header('Authorization', auth.header)
      .json({ steps: [{ actionId: action.id, parameters: '{}' }] })

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data.firmwareWarnings, 1)
    assert.equal(body.data.firmwareWarnings[0].robotDogId, dog.id)
    assert.equal(body.data.firmwareWarnings[0].robotFirmwareVersion, '1.0.0')
    assert.equal(body.data.firmwareWarnings[0].incompatibleActions[0].code, 'BARK')
  })

  test('sérialise correctement la mission (id, name, missionSteps) à côté de firmwareWarnings', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      isActive: true,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: auth.user.id,
    })

    const response = await client
      .put(`/api/v1/missions/${mission.id}/steps`)
      .header('Authorization', auth.header)
      .json({ steps: [{ actionId: action.id, parameters: '{}' }] })

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.data.id, mission.id)
    assert.equal(body.data.name, 'Patrol')
    assert.lengthOf(body.data.missionSteps, 1)
    assert.equal(body.data.missionSteps[0].actionId, action.id)
    assert.isArray(body.data.firmwareWarnings)
  })
})
