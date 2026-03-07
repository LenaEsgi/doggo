import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidMissionIdError } from '#app/modules/missions/domain/exceptions/invalid-mission-id.error'


export class MissionId extends UniqueEntityId {

  private constructor(value: string) {
    super(value)
  }

  public static generate(): MissionId {
    return new MissionId(this.generateUuid())
  }

  public static fromString(value: string): MissionId {
    try {
      this.validate(value)
      return new MissionId(value)
    } catch {
      throw new InvalidMissionIdError(value)
    }
  }
}
