import { type RobotErrorSeverity } from '#app/modules/robot-communication/domain/enums/robot-error-severity'

export interface RobotErrorEvent {
  code: string
  component: string
  message: string
  severity: RobotErrorSeverity
  context?: Record<string, unknown>
}
