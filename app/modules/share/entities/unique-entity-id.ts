import { randomUUID } from 'node:crypto'

export abstract class UniqueEntityId {
  protected constructor(public readonly value: string) {}

  private static UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  protected static validate(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Id cannot be empty')
    }

    if (!UniqueEntityId.UUID_REGEX.test(value)) {
      throw new Error('Invalid UUID format')
    }
  }

  protected static generateUuid(): string {
    return randomUUID()
  }

  public equals(id: UniqueEntityId): boolean {
    return this.value === id.value
  }

  public toString(): string {
    return this.value
  }
}
