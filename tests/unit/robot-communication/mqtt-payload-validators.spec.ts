import { test } from '@japa/runner'
import { robotTelemetryValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-telemetry.validator'
import { robotMissionUpdateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-mission-update.validator'
import { robotStateValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-state.validator'
import { robotRebootEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-reboot-event.validator'
import { robotErrorEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-error-event.validator'
import { robotConnectivityEventValidator } from '#app/modules/robot-communication/infrastructure/mqtt/validators/robot-connectivity-event.validator'
import { MissionStepStatus } from '#app/modules/missions/domain/enums/mission-step-status'
import { RobotDogState } from '#dogs/domain/enums/robot-dog.state'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'
import { RobotConnectivityStatus } from '#app/modules/robot-communication/domain/enums/robot-connectivity-status'
import { RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'

test.group('MQTT payload validators', () => {
  test('accepts a valid telemetry payload', async ({ assert }) => {
    const out = await robotTelemetryValidator.validate({ battery: 80 })
    assert.equal(out.battery, 80)
  })

  test('accepts telemetry on battery even when an unknown state field is present', async ({
    assert,
  }) => {
    // Le state n'est pas validé ici : un state inconnu ne doit pas rejeter la télémétrie.
    const out = await robotTelemetryValidator.validate({ battery: 42, state: 'NOT_A_STATE' })
    assert.equal(out.battery, 42)
  })

  test('rejects telemetry with non-numeric battery', async ({ assert }) => {
    await assert.rejects(() => robotTelemetryValidator.validate({ battery: 'full' }))
  })

  test('rejects telemetry with battery out of range', async ({ assert }) => {
    await assert.rejects(() => robotTelemetryValidator.validate({ battery: 150 }))
  })

  test('accepts a valid mission update payload', async ({ assert }) => {
    const out = await robotMissionUpdateValidator.validate({
      missionId: '550e8400-e29b-41d4-a716-446655440000',
      stepId: '550e8400-e29b-41d4-a716-446655440001',
      status: MissionStepStatus.COMPLETED,
    })
    assert.equal(out.missionId, '550e8400-e29b-41d4-a716-446655440000')
    assert.equal(out.stepId, '550e8400-e29b-41d4-a716-446655440001')
    assert.equal(out.status, MissionStepStatus.COMPLETED)
  })

  test('rejects mission update with missing stepId', async ({ assert }) => {
    await assert.rejects(() =>
      robotMissionUpdateValidator.validate({
        missionId: '550e8400-e29b-41d4-a716-446655440000',
        status: MissionStepStatus.COMPLETED,
      })
    )
  })

  test('rejects mission update with invalid status enum value', async ({ assert }) => {
    await assert.rejects(() =>
      robotMissionUpdateValidator.validate({
        missionId: '550e8400-e29b-41d4-a716-446655440000',
        stepId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'NOT_A_STATUS',
      })
    )
  })

  test('accepts a valid state payload', async ({ assert }) => {
    const out = await robotStateValidator.validate({ state: RobotDogState.CHARGING })
    assert.equal(out.state, RobotDogState.CHARGING)
  })

  test('rejects state payload with invalid enum value', async ({ assert }) => {
    await assert.rejects(() => robotStateValidator.validate({ state: 'NOT_A_STATE' }))
  })

  test('accepts a valid reboot payload', async ({ assert }) => {
    const out = await robotRebootEventValidator.validate({
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.WATCHDOG_RESET,
      uptimeBeforeRebootSec: 3600,
    })
    assert.equal(out.firmwareVersion, '1.2.3')
    assert.equal(out.bootReason, RobotBootReason.WATCHDOG_RESET)
    assert.equal(out.uptimeBeforeRebootSec, 3600)
  })

  test('accepts a reboot payload without uptimeBeforeRebootSec', async ({ assert }) => {
    const out = await robotRebootEventValidator.validate({
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.POWER_ON,
    })
    assert.equal(out.firmwareVersion, '1.2.3')
  })

  test('rejects reboot payload with invalid bootReason', async ({ assert }) => {
    await assert.rejects(() =>
      robotRebootEventValidator.validate({ firmwareVersion: '1.2.3', bootReason: 'NOT_A_REASON' })
    )
  })

  test('rejects reboot payload with missing firmwareVersion', async ({ assert }) => {
    await assert.rejects(() =>
      robotRebootEventValidator.validate({ bootReason: RobotBootReason.POWER_ON })
    )
  })

  test('accepts a valid error payload with context', async ({ assert }) => {
    const out = await robotErrorEventValidator.validate({
      code: 'MOTOR_STALL',
      component: 'motor_driver',
      message: 'Moteur bloqué',
      severity: RobotErrorSeverity.CRITICAL,
      context: { rpm: 0 },
    })
    assert.equal(out.code, 'MOTOR_STALL')
    assert.equal(out.severity, RobotErrorSeverity.CRITICAL)
    assert.deepEqual(out.context, { rpm: 0 })
  })

  test('accepts a valid error payload without context', async ({ assert }) => {
    const out = await robotErrorEventValidator.validate({
      code: 'SENSOR_TIMEOUT',
      component: 'lidar',
      message: 'Capteur non réactif',
      severity: RobotErrorSeverity.WARNING,
    })
    assert.equal(out.code, 'SENSOR_TIMEOUT')
  })

  test('rejects error payload with invalid severity', async ({ assert }) => {
    await assert.rejects(() =>
      robotErrorEventValidator.validate({
        code: 'X',
        component: 'y',
        message: 'z',
        severity: 'NOT_A_SEVERITY',
      })
    )
  })

  test('rejects error payload with missing code', async ({ assert }) => {
    await assert.rejects(() =>
      robotErrorEventValidator.validate({
        component: 'y',
        message: 'z',
        severity: RobotErrorSeverity.WARNING,
      })
    )
  })

  test('accepts a valid connectivity payload', async ({ assert }) => {
    const out = await robotConnectivityEventValidator.validate({
      status: RobotConnectivityStatus.DISCONNECTED,
      reason: RobotConnectivityReason.LWT_TIMEOUT,
      rssi: -70,
    })
    assert.equal(out.status, RobotConnectivityStatus.DISCONNECTED)
    assert.equal(out.reason, RobotConnectivityReason.LWT_TIMEOUT)
  })

  test('accepts a connectivity payload without reason/rssi', async ({ assert }) => {
    const out = await robotConnectivityEventValidator.validate({
      status: RobotConnectivityStatus.CONNECTED,
    })
    assert.equal(out.status, RobotConnectivityStatus.CONNECTED)
  })

  test('rejects connectivity payload with invalid status', async ({ assert }) => {
    await assert.rejects(() =>
      robotConnectivityEventValidator.validate({ status: 'NOT_A_STATUS' })
    )
  })
})
