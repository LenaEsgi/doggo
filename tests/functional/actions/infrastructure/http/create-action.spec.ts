import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('POST /api/v1/actions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create a new active action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({
        code: 'JUMP',
        name: 'Sauter',
        slug: 'jump',
        description: 'Faire sauter le robot',
      })

    response.assertStatus(201)

    const created = await ActionModel.query().where('code', 'JUMP').firstOrFail()
    assert.equal(created.name, 'Sauter')
    assert.isTrue(created.isActive)
  })

  test('should return 409 when code already exists', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await ActionModel.create({
      id: randomUUID(),
      code: 'JUMP',
      name: 'Sauter',
      slug: 'jump',
      description: null,
      isActive: true,
    })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({ code: 'JUMP', name: 'Autre', slug: 'autre' })

    response.assertStatus(409)
  })

  test('should return 409 when slug already exists', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await ActionModel.create({
      id: randomUUID(),
      code: 'JUMP',
      name: 'Sauter',
      slug: 'jump',
      description: null,
      isActive: true,
    })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({ code: 'OTHER', name: 'Autre', slug: 'jump' })

    response.assertStatus(409)
  })

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .post('/api/v1/actions')
      .header('Authorization', auth.header)
      .json({ code: 'JUMP', name: 'Sauter', slug: 'jump' })

    response.assertStatus(403)
  })
})
