import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import ActionModel from '#app/modules/actions/infrastructure/database/models/action'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionStepModel from '#app/modules/missions/infrastructure/database/models/mission-step'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'

test.group('PATCH /api/v1/actions/:id', (group) => {
  group.each.setup(() => truncateDb())

  test('should update the code of an unused action', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'OLD_CODE',
      name: 'Name',
      slug: 'name',
      description: null,
      isActive: true,
    })

    const response = await client
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ code: 'NEW_CODE' })

    response.assertStatus(200)

    const updated = await ActionModel.find(action.id)
    assert.equal(updated!.code, 'NEW_CODE')
  })

  test('should return 409 when changing parameterSchema of an action already used by a mission step', async ({
    client,
    cleanup,
  }) => {
    const owner = await authenticateAs(cleanup, { firebaseUid: 'mission-owner-update-action' })

    const action = await ActionModel.create({
      id: randomUUID(),
      code: 'MOVE_TEST',
      name: 'Move',
      slug: 'move-test',
      description: null,
      isActive: true,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Patrol',
      userId: owner.user.id,
    })

    await MissionStepModel.create({
      id: randomUUID(),
      missionId: mission.id,
      actionId: action.id,
      sequenceOrder: 1,
      parameters: '{}',
    })

    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const response = await client
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ parameterSchema: { fields: [] } })

    response.assertStatus(409)
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
      .patch(`/api/v1/actions/${action.id}`)
      .header('Authorization', auth.header)
      .json({ name: 'Nope' })

    response.assertStatus(403)
  })
})
