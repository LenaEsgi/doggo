import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'

import { InvalidRobotDogNameError } from '#dogs/domain/exceptions/invalid-robot-dog-name.error'
import { InvalidRobotDogSerialNumberError } from '#dogs/domain/exceptions/invalid-robot-dog-serial-number.error'
import { InvalidBatteryLevelError } from '#dogs/domain/exceptions/invalid-battery-level-error'
import { BatteryTooLowError } from '#dogs/domain/exceptions/battery-too-low-error'
import { InvalidDogStateError } from '#dogs/domain/exceptions/invalid-dog-state-error'

test.group('RobotDog Entity', () => {
  test('should create robot dog successfully', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    assert.equal(dog.serialNumber, 'SN-001')
    assert.equal(dog.name, 'Rex')
    assert.equal(dog.state, RobotDogState.IDLE)
    assert.equal(dog.batteryLevel, 80)
  })

  test('should throw if serial number is empty', async ({ assert }) => {
    assert.throws(() => {
      RobotDog.create('', 'Rex', 80)
    }, InvalidRobotDogSerialNumberError)
  })

  test('should throw if name is empty', async ({ assert }) => {
    assert.throws(() => {
      RobotDog.create('SN-001', '', 80)
    }, InvalidRobotDogNameError)
  })

  test('should throw if battery invalid', ({ assert }) => {
    assert.throws(() => {
      RobotDog.create('SN-001', 'Rex', 200)
    }, InvalidBatteryLevelError)
  })

  test('should update name', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.updateName('Bolt')

    assert.equal(dog.name, 'Bolt')
  })

  test('should throw when updating name with empty value', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    assert.throws(() => {
      dog.updateName('')
    }, InvalidRobotDogNameError)
  })

  test('should update battery level', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.updateBatteryLevel(50)

    assert.equal(dog.batteryLevel, 50)
  })

  test('should throw when updating invalid battery', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    assert.throws(() => {
      dog.updateBatteryLevel(-10)
    }, InvalidBatteryLevelError)
  })

  test('should start session when idle and battery sufficient', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.startSession()

    assert.equal(dog.state, RobotDogState.IN_SESSION)
  })

  test('should throw if battery too low when starting session', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 5)

    assert.throws(() => {
      dog.startSession()
    }, BatteryTooLowError)
  })

  test('should end session', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.startSession()
    dog.endSession()

    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should throw when ending session if not in session', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    assert.throws(() => {
      dog.endSession()
    }, InvalidDogStateError)
  })

  test('should pass mission validation when idle', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.validateForMission()

    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should mark charging', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.markCharging()

    assert.equal(dog.state, RobotDogState.CHARGING)
  })

  test('should restore online', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    dog.markOffline()
    dog.restoreOnline()

    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should mark offline when heartbeat timeout exceeded', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    const future = new Date(Date.now() + 40_000)

    dog.checkHeartbeatTimeout(future)

    assert.equal(dog.state, RobotDogState.OFFLINE)
  })

  test('should NOT mark offline if heartbeat still valid', ({ assert }) => {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    const future = new Date(Date.now() + 10_000)

    dog.checkHeartbeatTimeout(future)

    assert.notEqual(dog.state, RobotDogState.OFFLINE)
  })
})
