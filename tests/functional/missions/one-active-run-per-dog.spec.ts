import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import UserModel from '#users/infrastructure/database/models/user'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'

test.group('mission_runs unique active constraint', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a second active run for the same dog is rejected', async ({ assert }) => {
    const repo = new MissionRunRepositoryImplementation()

    const user = await UserModel.create({
      firebaseUid: 'firebase-uid-one-active-run',
      firstname: 'Test',
      lastname: 'User',
      email: 'one-active-run@example.com',
      role: UserRole.USER,
    })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-ONE-ACTIVE-RUN-001',
      key: 'OneActiveRunDogKey123',
      name: 'RaceDog',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
    })

    const missionA = await MissionModel.create({
      id: randomUUID(),
      name: 'A',
      userId: user.id,
    })
    const missionB = await MissionModel.create({
      id: randomUUID(),
      name: 'B',
      userId: user.id,
    })

    const run1 = MissionRun.start(
      MissionId.fromString(missionA.id),
      RobotDogId.fromString(dog.id),
      []
    )
    await repo.save(run1)

    const run2 = MissionRun.start(
      MissionId.fromString(missionB.id),
      RobotDogId.fromString(dog.id),
      []
    )
    await assert.rejects(() => repo.save(run2), InvalidMissionAlreadyRunningError)
  })
})
