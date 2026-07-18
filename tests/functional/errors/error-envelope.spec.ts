import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('Error envelope', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('unknown dog → 404 with { error, message }', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })
    const response = await client
      .get('/api/v1/dogs/550e8400-e29b-41d4-a716-446655440000')
      .header('Authorization', auth.header)

    response.assertStatus(404)
    response.assertBodyContains({ error: 'ROBOT_DOG_NOT_FOUND' })
  })
})
