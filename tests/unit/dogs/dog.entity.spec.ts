import { test } from '@japa/runner'
import { RobotDog } from '../../../app/modules/dogs/domain/robot_dog.entity.js'
import { RobotDogState } from '../../../app/modules/dogs/domain/enums/robot_dog.state.js'
import { InvalidDogStateError } from '../../../app/modules/dogs/domain/exceptions/invalid_dog_state_error.js'
import { InvalidBatteryLevelError } from '../../../app/modules/dogs/domain/exceptions/invalid_battery_level_error.js'
import { BatteryTooLowError } from '../../../app/modules/dogs/domain/exceptions/battery_too_low_error.js'

test.group('Dog Domain', (group) => {
  let dog: RobotDog

  group.each.setup(() => {
    dog = RobotDog.create('SN-001', 100)
  })

  // ----------------------------
  // Creation / Factory
  // ----------------------------
  test('should create dog in IDLE state', ({ assert }) => {
    assert.equal(dog.state, RobotDogState.IDLE)
    assert.equal(dog.batteryLevel, 100)
  })

  // ----------------------------
  // Session
  // ----------------------------
  test('should start session when idle', ({ assert }) => {
    dog.startSession()
    assert.equal(dog.state, RobotDogState.IN_SESSION)
  })

  test('should not start session if not idle', ({ assert }) => {
    dog.startSession()
    assert.throws(() => dog.startSession(), InvalidDogStateError)
  })

  test('should end session properly', ({ assert }) => {
    dog.startSession()
    dog.endSession()
    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should not end session if not in session', ({ assert }) => {
    assert.throws(() => dog.endSession(), InvalidDogStateError)
  })

  // ----------------------------
  // Mission
  // ----------------------------
  test('should start mission when idle', ({ assert }) => {
    dog.startMission()
    assert.equal(dog.state, RobotDogState.IN_MISSION)
  })

  test('should not start mission if in session', ({ assert }) => {
    dog.startSession()
    assert.throws(() => dog.startMission(), InvalidDogStateError)
  })

  test('should end mission properly', ({ assert }) => {
    dog.startMission()
    dog.endMission()
    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should not end mission if not in mission', ({ assert }) => {
    assert.throws(() => dog.endMission(), InvalidDogStateError)
  })

  // ----------------------------
  // Charging
  // ----------------------------
  test('should start charging only if idle', ({ assert }) => {
    dog.markCharging()
    assert.equal(dog.state, RobotDogState.CHARGING)
  })

  test('should not charge if in mission', ({ assert }) => {
    dog.startMission()
    assert.throws(() => dog.markCharging(), InvalidDogStateError)
  })

  test('should stop charging properly', ({ assert }) => {
    dog.markCharging()
    dog.stopCharging()
    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should not stop charging if not charging', ({ assert }) => {
    assert.throws(() => dog.stopCharging(), InvalidDogStateError)
  })

  // ----------------------------
  // Battery
  // ----------------------------
  test('should throw if battery level < 0', ({ assert }) => {
    assert.throws(() => dog.updateBatteryLevel(-1), InvalidBatteryLevelError)
  })

  test('should throw if battery level > 100', ({ assert }) => {
    assert.throws(() => dog.updateBatteryLevel(101), InvalidBatteryLevelError)
  })

  test('should throw if battery too low for session', ({ assert }) => {
    dog.updateBatteryLevel(5)
    assert.throws(() => dog.startSession(), BatteryTooLowError)
  })

  test('should throw if battery too low for mission', ({ assert }) => {
    dog.updateBatteryLevel(5)
    assert.throws(() => dog.startMission(), BatteryTooLowError)
  })

  // ----------------------------
  // Offline / Error
  // ----------------------------
  test('should not start mission if offline', ({ assert }) => {
    dog.markOffline()
    assert.throws(() => dog.startMission(), InvalidDogStateError)
  })

  test('should not start session if error', ({ assert }) => {
    dog.markError()
    assert.throws(() => dog.startSession(), InvalidDogStateError)
  })

  test('should restore from offline', ({ assert }) => {
    dog.markOffline()
    dog.restoreOnline()
    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should not restore if not offline', ({ assert }) => {
    assert.throws(() => dog.restoreOnline(), InvalidDogStateError)
  })

  // ----------------------------
  // Heartbeat
  // ----------------------------
  test('should go offline after heartbeat timeout', ({ assert }) => {
    const oldDate = new Date(Date.now() - 60_000)
    dog.updateHeartbeat(oldDate)
    dog.checkHeartbeatTimeout(new Date())
    assert.equal(dog.state, RobotDogState.OFFLINE)
  })

  test('should not go offline if heartbeat recent', ({ assert }) => {
    const recent = new Date(Date.now() - 10_000)
    dog.updateHeartbeat(recent)
    dog.checkHeartbeatTimeout(new Date())
    assert.equal(dog.state, RobotDogState.IDLE)
  })
})
