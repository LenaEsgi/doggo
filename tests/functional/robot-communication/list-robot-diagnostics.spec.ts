import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { truncateDb } from '#tests/functional/helpers/truncate'
import { authenticateAs } from '#tests/functional/helpers/auth'
import { UserRole } from '#users/domain/enums/user.role'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotDiagnosticEventRepositoryImplementation } from '#app/modules/robot-communication/infrastructure/database/repositories/robot-diagnostic-event.repository.implementation'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'

test.group('GET /api/v1/backoffice/diagnostics', (group) => {
  group.each.setup(() => truncateDb())

  test('should return 403 when authenticated as a non-admin user', async ({ client, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.USER })

    const response = await client
      .get('/api/v1/backoffice/diagnostics')
      .header('Authorization', auth.header)

    response.assertStatus(403)
  })

  test('should return 401 when no bearer token is provided', async ({ client }) => {
    const response = await client.get('/api/v1/backoffice/diagnostics')

    response.assertStatus(401)
  })

  test('should return paginated diagnostic events with dog name for an admin', async ({
    client,
    assert,
    cleanup,
  }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-DIAG-HTTP-001',
      key: 'DiagHttpDogKey1234',
      name: 'Kobe',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
    })

    await new RobotDiagnosticEventRepositoryImplementation().save(
      RobotDiagnosticEvent.fromReboot(dog.id, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.WATCHDOG_RESET,
      })
    )

    const response = await client
      .get('/api/v1/backoffice/diagnostics')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    const body = response.body()
    assert.equal(body.data.length, 1)
    assert.equal(body.data[0].dogName, 'Kobe')
    assert.equal(body.data[0].type, 'REBOOT')
    assert.equal(body.meta.total, 1)
  })

  test('filters by type', async ({ client, assert, cleanup }) => {
    const auth = await authenticateAs(cleanup, { role: UserRole.ADMIN })

    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: 'SN-DIAG-HTTP-002',
      key: 'DiagHttpDogKey5678',
      name: 'Ginger',
      state: RobotDogState.IDLE,
      batteryLevel: 80,
    })

    await new RobotDiagnosticEventRepositoryImplementation().save(
      RobotDiagnosticEvent.fromReboot(dog.id, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )

    const response = await client
      .get('/api/v1/backoffice/diagnostics?type=ERROR')
      .header('Authorization', auth.header)

    response.assertStatus(200)
    assert.equal(response.body().data.length, 0)
  })
})
