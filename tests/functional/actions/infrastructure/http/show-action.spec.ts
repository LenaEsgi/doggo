import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'

test.group('GET /api/v1/actions/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return an action by id, including a deactivated one', async ({
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
      description: null,
      isActive: false,
    })

    const response = await client
      .get(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(200)
    assert.equal(response.body().data.slug, 'bark')
    assert.isFalse(response.body().data.isActive)
  })

  test('should return 404 when action does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup)

    const response = await client
      .get('/api/v1/actions/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)
  })
})
