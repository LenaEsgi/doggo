import { test } from '@japa/runner'
import { RobotDogId } from '../../../../../app/modules/dogs/domain/value-objects/robot-dog-id.js'
import { InvalidRobotDogIdError } from '../../../../../app/modules/dogs/domain/exceptions/invalid-robot-dog-id.error.js'

test.group('RobotDogId Value Object', () => {

  test('generate() should create a valid UUID v4', ({ assert }) => {
    const id = RobotDogId.generate()
    assert.match(id.value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  test('fromString() should accept a valid UUID v4', ({ assert }) => {
    const validUuid = '3d166748-929c-45d0-be50-c194832f8345'
    const id = RobotDogId.fromString(validUuid)
    assert.equal(id.value, validUuid)
  })

  test('fromString() should throw InvalidRobotDogIdError if empty', ({ assert }) => {
    assert.throws(() => RobotDogId.fromString(''), InvalidRobotDogIdError)
  })

  test('fromString() should throw InvalidRobotDogIdError if invalid format', ({ assert }) => {
    assert.throws(() => RobotDogId.fromString('not-a-uuid'), InvalidRobotDogIdError)
    assert.throws(() => RobotDogId.fromString('123'), InvalidRobotDogIdError)
    assert.throws(() => RobotDogId.fromString('00000000-0000-0000-0000-000000000000'), InvalidRobotDogIdError) // non v4
  })

  test('equals() should return true for same value', ({ assert }) => {
    const uuid = '3d166748-929c-45d0-be50-c194832f8345'
    const id1 = RobotDogId.fromString(uuid)
    const id2 = RobotDogId.fromString(uuid)

    assert.isTrue(id1.equals(id2))
  })

  test('equals() should return false for different values', ({ assert }) => {
    const id1 = RobotDogId.fromString('3d166748-929c-45d0-be50-c194832f8345')
    const id2 = RobotDogId.fromString('4d166748-929c-45d0-be50-c194832f8345')

    assert.isFalse(id1.equals(id2))
  })

})
