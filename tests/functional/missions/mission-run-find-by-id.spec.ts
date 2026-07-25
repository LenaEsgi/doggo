// tests/functional/missions/mission-run-find-by-id.spec.ts
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import MissionRunModel from '#app/modules/missions/infrastructure/database/models/mission-run'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'

test.group('MissionRunRepositoryImplementation.findById', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('retrouve un run même terminal (SUCCESS), avec ses steps', async ({ assert }) => {
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-FINDBYID-001',
      key: 'FindByIdDogKeyAAA111',
      name: 'FindByIdDog',
      state: RobotDogState.IDLE,
      batteryLevel: 90,
    })
    const user = await UserModel.create({
      firebaseUid: `firebase-uid-findbyid-${randomUUID()}`,
      firstname: 'Test',
      lastname: 'User',
      email: `findbyid-${randomUUID()}@example.com`,
      role: UserRole.USER,
    })
    const mission = await MissionModel.create({ id: randomUUID(), name: 'Patrouille', userId: user.id })
    const run = await MissionRunModel.create({
      id: randomUUID(),
      missionId: mission.id,
      robotDogId: dog.id,
      status: MissionRunStatus.SUCCESS,
      startedAt: DateTime.now(),
      endedAt: DateTime.now(),
    })

    const repository = new MissionRunRepositoryImplementation()
    const found = await repository.findById(run.id)

    assert.isNotNull(found)
    assert.equal(found?.status, MissionRunStatus.SUCCESS)
    assert.equal(found?.id.value, run.id)
  })

  test('retourne null si le run n\'existe pas', async ({ assert }) => {
    const repository = new MissionRunRepositoryImplementation()
    const found = await repository.findById(randomUUID())
    assert.isNull(found)
  })
})
