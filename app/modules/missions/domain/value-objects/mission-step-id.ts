import { InvalidMissionIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-id.error'
import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'

export class MissionStepId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionStepId {
    return new MissionStepId(this.generateUuid())
  }

  public static fromString(value: string): MissionStepId {
    try {
      this.validate(value)
      return new MissionStepId(value)
    } catch {
      throw new InvalidMissionIdError(value)
    }
  }
}
