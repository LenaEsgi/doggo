import { type RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'

export interface RobotDiagnosticEventWithDogNameDto {
  event: RobotDiagnosticEvent
  dogName: string
}
