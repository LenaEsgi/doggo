import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'
import { RobotDiagnosticEventRepositoryImplementation } from '#app/modules/robot-communication/infrastructure/database/repositories/robot-diagnostic-event.repository.implementation'

test.group('RobotDiagnosticEventRepositoryImplementation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function createDog(suffix: string): Promise<string> {
    const dog = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-DIAG-${suffix}`,
      key: `DiagDogKey${suffix}1234`,
      name: `Dog-${suffix}`,
      state: RobotDogState.IDLE,
      batteryLevel: 80,
    })
    return dog.id
  }

  test('save puis findAll retrouve un événement persisté', async ({ assert }) => {
    const repo = new RobotDiagnosticEventRepositoryImplementation()
    const dogId = await createDog('A')
    const event = RobotDiagnosticEvent.fromReboot(dogId, {
      firmwareVersion: '1.0.0',
      bootReason: RobotBootReason.WATCHDOG_RESET,
    })

    await repo.save(event)
    const result = await repo.findAll({})

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].dogId, dogId)
    assert.equal(result.data[0].type, RobotDiagnosticEventType.REBOOT)
  })

  test('findAll filtre par dogId', async ({ assert }) => {
    const repo = new RobotDiagnosticEventRepositoryImplementation()
    const dogA = await createDog('B')
    const dogB = await createDog('C')

    await repo.save(
      RobotDiagnosticEvent.fromReboot(dogA, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )
    await repo.save(
      RobotDiagnosticEvent.fromReboot(dogB, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )

    const result = await repo.findAll({ dogId: dogA })

    assert.equal(result.data.length, 1)
    assert.equal(result.data[0].dogId, dogA)
  })

  test('findAll filtre par type et par severity', async ({ assert }) => {
    const repo = new RobotDiagnosticEventRepositoryImplementation()
    const dogId = await createDog('D')

    await repo.save(
      RobotDiagnosticEvent.fromReboot(dogId, {
        firmwareVersion: '1.0.0',
        bootReason: RobotBootReason.POWER_ON,
      })
    )
    await repo.save(
      RobotDiagnosticEvent.fromError(dogId, {
        code: 'X',
        component: 'y',
        message: 'z',
        severity: RobotErrorSeverity.CRITICAL,
      })
    )

    const byType = await repo.findAll({ type: RobotDiagnosticEventType.ERROR })
    assert.equal(byType.data.length, 1)
    assert.equal(byType.data[0].type, RobotDiagnosticEventType.ERROR)

    const bySeverity = await repo.findAll({ severity: RobotDiagnosticSeverity.CRITICAL })
    assert.equal(bySeverity.data.length, 1)
  })

  test('findAll trie par occurredAt décroissant et pagine', async ({ assert }) => {
    const repo = new RobotDiagnosticEventRepositoryImplementation()
    const dogId = await createDog('E')

    for (let i = 0; i < 3; i++) {
      await repo.save(
        RobotDiagnosticEvent.fromReboot(dogId, {
          firmwareVersion: `1.0.${i}`,
          bootReason: RobotBootReason.POWER_ON,
        })
      )
    }

    const result = await repo.findAll({ page: 1, limit: 2 })

    assert.equal(result.data.length, 2)
    assert.equal(result.meta.total, 3)
    assert.equal(result.meta.lastPage, 2)
  })
})
