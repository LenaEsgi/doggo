import { UniqueEntityId } from '#app/modules/share/entities/unique-entity-id'
import { InvalidActionIdError } from '../exceptions/invalid-action-id.error.js'

export class ActionId extends UniqueEntityId {
  private constructor(value: string) {
    super(value)
  }

  public static generate(): ActionId {
    return new ActionId(this.generateUuid())
  }

  public static fromString(value: string): ActionId {
    try {
      this.validate(value)
      return new ActionId(value)
    } catch {
      throw new InvalidActionIdError(value)
    }
  }
}
