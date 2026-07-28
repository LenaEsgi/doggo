import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/actions', (group) => {
  group.each.setup(() => truncateDb())

  test('should exclude inactive actions by default', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    await ActionModel.create({
      id: randomUUID(),
      code: 'ACTIVE_ONE',
      name: 'Active',
      slug: 'active',
      description: null,
      isActive: true,
    })
    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_ONE',
      name: 'Inactive',
      slug: 'inactive',
      description: null,
      isActive: false,
    })

    const response = await client.get('/api/v1/actions').header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.include(codes, 'ACTIVE_ONE')
    assert.notInclude(codes, 'INACTIVE_ONE')
  })

  test('should ignore includeInactive for a non-admin user', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_TWO',
      name: 'Inactive',
      slug: 'inactive-two',
      description: null,
      isActive: false,
    })

    const response = await client
      .get('/api/v1/actions?includeInactive=true')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.notInclude(codes, 'INACTIVE_TWO')
  })

  test('should include inactive actions for an admin requesting includeInactive', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await ActionModel.create({
      id: randomUUID(),
      code: 'INACTIVE_THREE',
      name: 'Inactive',
      slug: 'inactive-three',
      description: null,
      isActive: false,
    })

    const response = await client
      .get('/api/v1/actions?includeInactive=true')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const codes = response.body().data.map((a: { code: string }) => a.code)
    assert.include(codes, 'INACTIVE_THREE')
  })
})
