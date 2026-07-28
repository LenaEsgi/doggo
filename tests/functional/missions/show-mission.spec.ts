import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/missions/:id', (group) => {
  group.each.setup(() => truncateDb())

  test('returns the mission with its creator and creation date', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup)
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrouille nord',
      userId: auth.user.id,
    })

    const response = await client
      .get(`/api/v1/missions/${mission.id}`)
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.name, 'Patrouille nord')
    assert.exists(body.createdAt)
    assert.equal(body.creator.firstname, auth.user.firstname)
    assert.equal(body.creator.lastname, auth.user.lastname)
    assert.equal(body.creator.email, auth.user.email)
  })

  test('an admin can view a mission created by another user', async ({
    client,
    assert,
    cleanup,
  }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'owner-uid' })
    const admin = await authenticateAs(cleanup, { firebaseUid: 'admin-uid', role: UserRole.ADMIN })
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Inspection sud',
      userId: owner.user.id,
    })

    const response = await client
      .get(`/api/v1/missions/${mission.id}`)
      .header('Authorization', admin.header)

    response.assertStatus(200)
    assert.equal(response.body().data.creator.email, owner.user.email)
  })

  test('a stranger cannot view a mission they do not own', async ({ client, cleanup }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'owner-uid' })
    const stranger = await authenticateAs(cleanup, { firebaseUid: 'stranger-uid' })
    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Inspection sud',
      userId: owner.user.id,
    })

    const response = await client
      .get(`/api/v1/missions/${mission.id}`)
      .header('Authorization', stranger.header)

    response.assertStatus(403)
  })
})
