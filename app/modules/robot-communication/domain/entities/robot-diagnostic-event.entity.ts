import { randomUUID } from 'node:crypto'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'
import { RobotBootReason } from '#app/modules/robot-communication/domain/enums/robot-boot-reason'
import { RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'
import { RobotConnectivityReason } from '#app/modules/robot-communication/domain/enums/robot-connectivity-reason'
import { type RobotRebootEvent } from '#app/modules/robot-communication/domain/types/robot-reboot-event.type'
import { type RobotErrorEvent } from '#app/modules/robot-communication/domain/types/robot-error-event.type'
import { type RobotConnectivityEvent } from '#app/modules/robot-communication/domain/types/robot-connectivity-event.type'

export class RobotDiagnosticEvent {
  private constructor(
    public readonly id: string,
    public readonly dogId: string,
    public readonly type: RobotDiagnosticEventType,
    public readonly severity: RobotDiagnosticSeverity,
    public readonly payload: Record<string, unknown>,
    public readonly occurredAt: Date
  ) {}

  static fromReboot(dogId: string, payload: RobotRebootEvent): RobotDiagnosticEvent {
    const severity =
      payload.bootReason === RobotBootReason.WATCHDOG_RESET ||
      payload.bootReason === RobotBootReason.CRASH
        ? RobotDiagnosticSeverity.WARNING
        : RobotDiagnosticSeverity.INFO

    return new RobotDiagnosticEvent(
      randomUUID(),
      dogId,
      RobotDiagnosticEventType.REBOOT,
      severity,
      { ...payload },
      new Date()
    )
  }

  static fromError(dogId: string, payload: RobotErrorEvent): RobotDiagnosticEvent {
    const severity =
      payload.severity === RobotErrorSeverity.CRITICAL
        ? RobotDiagnosticSeverity.CRITICAL
        : RobotDiagnosticSeverity.WARNING

    return new RobotDiagnosticEvent(
      randomUUID(),
      dogId,
      RobotDiagnosticEventType.ERROR,
      severity,
      { ...payload },
      new Date()
    )
  }

  static fromConnectivity(dogId: string, payload: RobotConnectivityEvent): RobotDiagnosticEvent {
    const severity =
      payload.reason === RobotConnectivityReason.LWT_TIMEOUT
        ? RobotDiagnosticSeverity.WARNING
        : RobotDiagnosticSeverity.INFO

    return new RobotDiagnosticEvent(
      randomUUID(),
      dogId,
      RobotDiagnosticEventType.CONNECTIVITY,
      severity,
      { ...payload },
      new Date()
    )
  }

  static rehydrate(
    id: string,
    dogId: string,
    type: RobotDiagnosticEventType,
    severity: RobotDiagnosticSeverity,
    payload: Record<string, unknown>,
    occurredAt: Date
  ): RobotDiagnosticEvent {
    return new RobotDiagnosticEvent(id, dogId, type, severity, payload, occurredAt)
  }
}
