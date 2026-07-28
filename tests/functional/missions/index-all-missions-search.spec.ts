import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('GET /api/v1/missions (search)', (group) => {
  group.each.setup(() => truncateDb())

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

  test('each mission includes its creator and creation date', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })
    await MissionModel.create({ id: randomUUID(), name: 'Patrouille nord', userId: auth.user.id })

    const response = await client.get('/api/v1/missions').header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.data[0].createdAt)
    assert.equal(body.data[0].creator.firstname, auth.user.firstname)
    assert.equal(body.data[0].creator.email, auth.user.email)
  })

  test('resolves distinct creators for missions from different users', async ({
    client,
    assert,
    cleanup,
  }) => {
    // authenticateAs swaps a single global fake token verifier, so whichever
    // user is authenticated last is the one active when the request fires —
    // authenticate the admin last since they're the one making the request.
    const otherUser = await authenticateAs(cleanup, { firebaseUid: 'other-uid' })
    const admin = await authenticateAs(cleanup, { firebaseUid: 'admin-uid', role: UserRole.ADMIN })
    await MissionModel.create({ id: randomUUID(), name: 'Mission A', userId: admin.user.id })
    await MissionModel.create({ id: randomUUID(), name: 'Mission B', userId: otherUser.user.id })

    const response = await client.get('/api/v1/missions').header('Authorization', admin.header)

    response.assertStatus(200)
    const body = response.body()
    const byName = (name: string) => body.data.find((m: { name: string }) => m.name === name)
    assert.equal(byName('Mission A').creator.email, admin.user.email)
    assert.equal(byName('Mission B').creator.email, otherUser.user.email)
  })
})
