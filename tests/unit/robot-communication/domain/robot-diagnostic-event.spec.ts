import { test } from '@japa/runner'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'
import { RobotConnectivityStatus } from '#app/modules/robot-communication/domain/enums/robot-connectivity-status'
import { RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'

test.group('RobotDiagnosticEvent', () => {
  test('fromReboot: watchdog_reset est une sévérité warning', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromReboot('dog-1', {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.WATCHDOG_RESET,
    })

    assert.equal(event.type, RobotDiagnosticEventType.REBOOT)
    assert.equal(event.severity, RobotDiagnosticSeverity.WARNING)
    assert.equal(event.dogId, 'dog-1')
    assert.deepEqual(event.payload, {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.WATCHDOG_RESET,
    })
  })

  test('fromReboot: crash est une sévérité warning', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromReboot('dog-1', {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.CRASH,
    })

    assert.equal(event.severity, RobotDiagnosticSeverity.WARNING)
  })

  test('fromReboot: power_on est une sévérité info', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromReboot('dog-1', {
      firmwareVersion: '1.2.3',
      bootReason: RobotBootReason.POWER_ON,
    })

    assert.equal(event.severity, RobotDiagnosticSeverity.INFO)
  })

  test('fromError: sévérité critical propagée depuis le payload', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromError('dog-1', {
      code: 'MOTOR_STALL',
      component: 'motor_driver',
      message: 'Moteur bloqué',
      severity: RobotErrorSeverity.CRITICAL,
    })

    assert.equal(event.type, RobotDiagnosticEventType.ERROR)
    assert.equal(event.severity, RobotDiagnosticSeverity.CRITICAL)
  })

  test('fromError: sévérité warning propagée depuis le payload', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromError('dog-1', {
      code: 'SENSOR_TIMEOUT',
      component: 'lidar',
      message: 'Capteur non réactif',
      severity: RobotErrorSeverity.WARNING,
    })

    assert.equal(event.severity, RobotDiagnosticSeverity.WARNING)
  })

  test('fromConnectivity: lwt_timeout est une sévérité warning', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromConnectivity('dog-1', {
      status: RobotConnectivityStatus.DISCONNECTED,
      reason: RobotConnectivityReason.LWT_TIMEOUT,
    })

    assert.equal(event.type, RobotDiagnosticEventType.CONNECTIVITY)
    assert.equal(event.severity, RobotDiagnosticSeverity.WARNING)
  })

  test('fromConnectivity: déconnexion propre est une sévérité info', ({ assert }) => {
    const event = RobotDiagnosticEvent.fromConnectivity('dog-1', {
      status: RobotConnectivityStatus.DISCONNECTED,
      reason: RobotConnectivityReason.CLEAN,
    })

    assert.equal(event.severity, RobotDiagnosticSeverity.INFO)
  })

  test('rehydrate reconstruit un événement identique', ({ assert }) => {
    const occurredAt = new Date('2026-07-22T10:00:00.000Z')
    const event = RobotDiagnosticEvent.rehydrate(
      'evt-1',
      'dog-1',
      RobotDiagnosticEventType.ERROR,
      RobotDiagnosticSeverity.CRITICAL,
      { code: 'X' },
      occurredAt
    )

    assert.equal(event.id, 'evt-1')
    assert.equal(event.occurredAt, occurredAt)
    assert.deepEqual(event.payload, { code: 'X' })
  })
})
