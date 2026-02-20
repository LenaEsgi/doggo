import { test } from '@japa/runner'
import { RobotDogKey } from '../../../../../app/modules/dogs/domain/value-objects/robot-dog-key.js'

test.group('RobotDogKey', () => {
  test('should generate a key with 18 characters', ({ assert }) => {
    const key = RobotDogKey.generate()
    assert.lengthOf(key.value, 18)
  })

  test('should throw if key from string is not 18 chars', ({ assert }) => {
    assert.throws(() => RobotDogKey.fromString('short'), 'RobotDogKey must be exactly 18 characters')
  })

  test('should equals return true for identical keys', ({ assert }) => {
    const key1 = RobotDogKey.fromString('ABCDEFGHIJKLMNOPQR')
    const key2 = RobotDogKey.fromString('ABCDEFGHIJKLMNOPQR')
    assert.isTrue(key1.equals(key2))
  })

  test('should equals return false for different keys', ({ assert }) => {
    const key1 = RobotDogKey.fromString('ABCDEFGHIJKLMNOPQR')
    const key2 = RobotDogKey.fromString('QRSTUVWXYZABCDEF12')
    assert.isFalse(key1.equals(key2))
  })
})
