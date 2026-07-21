import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/missions (search)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('filters missions by name when a search query param is provided', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await MissionModel.create({ id: randomUUID(), name: 'Patrouille nord', userId: auth.user.id })
    await MissionModel.create({ id: randomUUID(), name: 'Inspection sud', userId: auth.user.id })

    const response = await client
      .get('/api/v1/missions')
      .qs({ search: 'inspection' })
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data, 1)
    assert.equal(body.data[0].name, 'Inspection sud')
  })
})
