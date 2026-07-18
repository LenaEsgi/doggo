import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionScheduleIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-id.error'

export class MissionScheduleId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionScheduleId {
    return new MissionScheduleId(this.generateUuid())
  }

  public static fromString(value: string): MissionScheduleId {
    try {
      this.validate(value)
      return new MissionScheduleId(value)
    } catch {
      throw new InvalidMissionScheduleIdError(value)
    }
  }
}
