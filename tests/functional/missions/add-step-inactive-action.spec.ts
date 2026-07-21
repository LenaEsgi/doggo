import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('POST /api/v1/missions/:id/steps — action indisponible', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should reject adding a step referencing a deactivated action', async ({
    client,
    cleanup,
  }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-inactive' })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: owner.user.id,
    })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'RETIRED',
      name: 'Retired',
      slug: 'retired',
      description: null,
      isActive: false,
    })

    const response = await client
      .post(`/api/v1/missions/${mission.id}/steps`)
      .header('Authorization', owner.header)
      .json({ actionId: action.id, parameters: '{}' })

    response.assertStatus(409)
  })
})
