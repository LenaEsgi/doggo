import { test } from '@japa/runner'
import { MqttAccountPassword } from '#app/modules/robot-communication/domain/value-objects/mqtt-account-password'

test.group('MqttAccountPassword', () => {
  test('should generate a non-empty random string', ({ assert }) => {
    const password = MqttAccountPassword.generate()

    assert.isString(password.value)
    assert.isAbove(password.value.length, 16)
  })

  test('should generate a different value on each call', ({ assert }) => {
    const first = MqttAccountPassword.generate()
    const second = MqttAccountPassword.generate()

    assert.notEqual(first.value, second.value)
  })
})
