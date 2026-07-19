import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { RobotDogRepositoryImplementation } from '#dogs/infrastructure/database/repositories/robot-dog.repository.implementation'
import RobotDogModel from '#dogs/infrastructure/database/models/robot-dog'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

/** Génère une clé unique de longueur exacte 18 (contrainte de RobotDogKey). */
function uniqueKey(label: string): string {
  return `${label}${randomUUID().replace(/-/g, '')}`.slice(0, 18)
}

test.group('RobotDogRepositoryImplementation findStale', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('returns only non-OFFLINE dogs whose lastHeartbeat is older than the threshold', async ({
    assert,
  }) => {
    const repo = new RobotDogRepositoryImplementation()
    const now = DateTime.utc()
    const threshold = now.minus({ seconds: 30 }).toJSDate()

    const staleIdle = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-STALE-${randomUUID()}`,
      key: uniqueKey('stale-idle-'),
      name: 'StaleIdleDog',
      state: RobotDogState.IDLE,
      batteryLevel: 50,
      lastHeartbeat: now.minus({ minutes: 5 }),
    })

    const freshIdle = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-FRESH-${randomUUID()}`,
      key: uniqueKey('fresh-idle-'),
      name: 'FreshIdleDog',
      state: RobotDogState.IDLE,
      batteryLevel: 50,
      lastHeartbeat: now.plus({ minutes: 5 }),
    })

    const staleOffline = await RobotDogModel.create({
      id: randomUUID(),
      serialNumber: `SN-OFFLINE-${randomUUID()}`,
      key: uniqueKey('stale-offline-'),
      name: 'StaleOfflineDog',
      state: RobotDogState.OFFLINE,
      batteryLevel: 50,
      lastHeartbeat: now.minus({ minutes: 5 }),
    })

    const result = await repo.findStale(threshold)
    const ids = result.map((dog) => dog.id.value)

    assert.include(ids, staleIdle.id)
    assert.notInclude(ids, freshIdle.id)
    assert.notInclude(ids, staleOffline.id)
  })
})
