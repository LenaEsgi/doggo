import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionReportIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-report-id.error'

export class MissionReportId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionReportId {
    return new MissionReportId(this.generateUuid())
  }

  public static fromString(value: string): MissionReportId {
    try {
      this.validate(value)
      return new MissionReportId(value)
    } catch {
      throw new InvalidMissionReportIdError(value)
    }
  }
}
