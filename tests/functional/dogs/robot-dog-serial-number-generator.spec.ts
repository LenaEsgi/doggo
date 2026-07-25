import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { RobotDogSerialNumberGenerator } from '#dogs/domain/contracts/robot-dog-serial-number-generator'

/**
 * Exerce la vraie implémentation Postgres (séquence `robot_dogs_serial_seq`)
 * résolue depuis le container IoC, sans dépendre du broker MQTT : ce spec
 * n'a besoin que de Postgres, qui est provisionné en CI.
 */
test.group('RobotDogSerialNumberGenerator (Postgres implementation)', () => {
  test('generates values matching SN-000123 format', async ({ assert }) => {
    const generator = await app.container.make(RobotDogSerialNumberGenerator)

    const serialNumber = await generator.generate()

    assert.match(serialNumber, /^SN-\d{6}$/)
  })

  test('generates strictly increasing, distinct values across successive calls', async ({
    assert,
  }) => {
    const generator = await app.container.make(RobotDogSerialNumberGenerator)

    const first = await generator.generate()
    const second = await generator.generate()

    assert.match(first, /^SN-\d{6}$/)
    assert.match(second, /^SN-\d{6}$/)
    assert.notEqual(first, second)

    const firstValue = Number(first.replace('SN-', ''))
    const secondValue = Number(second.replace('SN-', ''))
    assert.isAbove(secondValue, firstValue)
  })
})
