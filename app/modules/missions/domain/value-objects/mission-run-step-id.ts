import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionRunStepIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-run-step-id.error'

export class MissionRunStepId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionRunStepId {
    return new MissionRunStepId(this.generateUuid())
  }

  public static fromString(value: string): MissionRunStepId {
    try {
      this.validate(value)
      return new MissionRunStepId(value)
    } catch {
      throw new InvalidMissionRunStepIdError(value)
    }
  }
}
