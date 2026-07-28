import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/functional/helpers/truncate'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'
import UserModel from '#users/infrastructure/database/models/user'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import MissionModel from '#app/modules/missions/infrastructure/database/models/mission'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionRunRepositoryImplementation } from '#app/modules/missions/infrastructure/database/repositories/mission-run.repository.implementation'
import NotificationModel from '#app/modules/notifications/infrastructure/database/models/notification.model'

test.group('GET /api/v1/backoffice/stats', (group) => {
  group.each.setup(() => truncateDb())

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .get('/api/v1/backoffice/stats')
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })

  test('should return aggregated fleet stats for an admin', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    await UserModel.create({
      firebaseUid: 'firebase-uid-stats-other',
      firstname: 'Other',
      lastname: 'User',
      email: 'other-stats-user@example.com',
      role: UserRole.USER,
    })

    const dogA = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-STATS-001',
      key: 'StatsDogKeyAbc1234',
      name: 'Kobe',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
    })
    await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-STATS-002',
      key: 'StatsDogKeyDef4567',
      name: 'Ginger',
      state: RobotDogState.IDLE,
      batteryLevel: 60,
    })

    const mission = await MissionModel.create({
      id: randomUUID(),
      name: 'Stats mission',
      userId: auth.user.id,
    })

    const run = MissionRun.start(
      MissionId.fromString(mission.id),
      RobotDogId.fromString(dogA.id),
      []
    )
    await new MissionRunRepositoryImplementation().save(run)

    await NotificationModel.create({
      userId: auth.user.id,
      type: 'robot.offline',
      message: 'Kobe went offline',
      severity: 'critical',
      payload: null,
      robotDogId: dogA.id,
      isRead: false,
    })
    await NotificationModel.create({
      userId: auth.user.id,
      type: 'robot.battery.low',
      message: 'Ginger battery low',
      severity: 'warning',
      payload: null,
      robotDogId: null,
      isRead: false,
    })
    await NotificationModel.create({
      userId: auth.user.id,
      type: 'mission.completed',
      message: 'Mission completed',
      severity: 'info',
      payload: null,
      robotDogId: null,
      isRead: false,
    })
    const yesterdayAlert = await NotificationModel.create({
      userId: auth.user.id,
      type: 'robot.offline',
      message: 'Old alert',
      severity: 'critical',
      payload: null,
      robotDogId: null,
      isRead: false,
    })
    yesterdayAlert.createdAt = DateTime.now().minus({ days: 1 })
    await yesterdayAlert.save()

    const response = await client
      .get('/api/v1/backoffice/stats')
      .header('Authorization', auth.header)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.robotsCount, 2)
    assert.equal(body.usersCount, 2)
    assert.equal(body.ongoingMissionsCount, 1)
    assert.equal(body.alertsTodayCount, 2)
  })

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client.get('/api/v1/backoffice/stats')

    response.assertStatus(401)
  })
})
