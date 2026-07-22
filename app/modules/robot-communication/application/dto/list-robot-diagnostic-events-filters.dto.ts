import { type RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { type RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'

export interface ListRobotDiagnosticEventsFiltersDto {
  page?: number
  limit?: number
  dogId?: string
  type?: RobotDiagnosticEventType
  severity?: RobotDiagnosticSeverity
  from?: Date
  to?: Date
}
