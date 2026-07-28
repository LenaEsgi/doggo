import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('PATCH /api/v1/actions/:id/toggle', (group) => {
  group.each.setup(() => truncateDb())

  test('should reactivate a deactivated action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: false,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}/toggle`)
      .header('Authorization', auth.header)
      .json({ isActive: true })

    response.assertStatus(200)

    const updated = await ActionModel.find(action.id)
    assert.isTrue(updated!.isActive)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'BARK',
      name: 'Aboyer',
      slug: 'bark',
      description: null,
      isActive: false,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}/toggle`)
      .header('Authorization', auth.header)
      .json({ isActive: true })

    response.assertStatus(403)
  })
})
