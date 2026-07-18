import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { InvalidDogStateError } from '#dogs/domain/exceptions/invalid-dog-state-error'
import { InvalidBatteryLevelError } from '#dogs/domain/exceptions/invalid-battery-level-error'
import { BatteryTooLowError } from '#dogs/domain/exceptions/battery-too-low-error'
import { InvalidRobotDogNameError } from '#dogs/domain/exceptions/invalid-robot-dog-name.error'

test.group('Dog Domain', (group) => {
  let dog: RobotDog

  group.each.setup(() => {
    dog = RobotDog.create('SN-001', 'dog', 100)
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
  test('should pass mission validation when idle', ({ assert }) => {
    dog.validateForMission()
    assert.equal(dog.state, RobotDogState.IDLE)
  })

  test('should not pass mission validation if in session', ({ assert }) => {
    dog.startSession()
    assert.throws(() => dog.validateForMission(), InvalidDogStateError)
  })

  test('should end mission properly', ({ assert }) => {
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
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
    dog.applyStateFromRobot(RobotDogState.IN_MISSION)
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
    assert.throws(() => dog.validateForMission(), BatteryTooLowError)
  })

  // ----------------------------
  // Offline / Error
  // ----------------------------
  test('should not pass mission validation if offline', ({ assert }) => {
    dog.markOffline()
    assert.throws(() => dog.validateForMission(), InvalidDogStateError)
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

  test('updateName should throw if name is empty', ({ assert }) => {
    dog = RobotDog.create('SN-001', 'Rex', 80)

    assert.throws(() => dog.updateName(''), InvalidRobotDogNameError)
  })

  test('updateName should update name if valid', ({ assert }) => {
    dog = RobotDog.create('SN-001', 'Rex', 80)
    dog.updateName('Bolt')
    assert.equal(dog.name, 'Bolt')
  })
})
