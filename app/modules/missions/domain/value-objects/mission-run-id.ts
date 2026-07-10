import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionRunIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-id.error'

export class MissionRunId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionRunId {
    return new MissionRunId(this.generateUuid())
  }

  public static fromString(value: string): MissionRunId {
    try {
      this.validate(value)
      return new MissionRunId(value)
    } catch {
      throw new InvalidMissionRunIdError(value)
    }
  }
}
