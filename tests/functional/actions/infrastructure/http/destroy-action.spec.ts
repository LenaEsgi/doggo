import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('DELETE /api/v1/actions/:id', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should deactivate the action instead of deleting it', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: true,
    })

    const response = await client
      .delete(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(200)

    const stillThere = await ActionModel.find(action.id)
    assert.exists(stillThere)
    assert.isFalse(stillThere!.isActive)
  })

  test('should return 404 when action does not exist', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .delete('/api/v1/actions/56a39d4d-b05d-42fb-a402-6782fc66dc3d')
      .header('Authorization', auth.header)

    response.assertStatus(404)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: true,
    })

    const response = await client
      .delete(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })
})
