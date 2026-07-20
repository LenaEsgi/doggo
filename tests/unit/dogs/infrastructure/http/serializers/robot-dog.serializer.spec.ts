import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'

test.group('RobotDogSerializer', () => {
  test('should include the key when includeKey is true', ({ assert }) => {
    const robotDog = RobotDog.create('SN-001', 'Rex')

    const json = RobotDogSerializer.toJson({ robotDog, usersCount: 0 }, { includeKey: true })

    assert.equal(json.key, robotDog.key.value)
  })

  test('should omit the key by default', ({ assert }) => {
    const robotDog = RobotDog.create('SN-001', 'Rex')

    const json = RobotDogSerializer.toJson({ robotDog, usersCount: 0 })

    assert.notProperty(json, 'key')
  })

  test('should omit the key when includeKey is false', ({ assert }) => {
    const robotDog = RobotDog.create('SN-001', 'Rex')

    const json = RobotDogSerializer.toJson({ robotDog, usersCount: 0 }, { includeKey: false })

    assert.notProperty(json, 'key')
  })
})
