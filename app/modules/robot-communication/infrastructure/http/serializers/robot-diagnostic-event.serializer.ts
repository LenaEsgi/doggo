import { type RobotDiagnosticEventWithDogNameDto } from '#app/modules/robot-communication/application/dto/robot-diagnostic-event-with-dog-name.dto'

export class RobotDiagnosticEventSerializer {
  static toJson(dto: RobotDiagnosticEventWithDogNameDto) {
    return {
      id: dto.event.id,
      dogId: dto.event.dogId,
      dogName: dto.dogName,
      type: dto.event.type,
      severity: dto.event.severity,
      payload: dto.event.payload,
      occurredAt: dto.event.occurredAt.toISOString(),
    }
  }

  static collection(dtos: RobotDiagnosticEventWithDogNameDto[]) {
    return dtos.map((dto) => this.toJson(dto))
  }
}
