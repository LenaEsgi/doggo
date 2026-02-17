import { randomUUID } from 'node:crypto'

export class RobotDogId {
  private constructor(public readonly value: string) {}

  public static generate(): RobotDogId {
    return new RobotDogId(randomUUID())
  }

  public static fromString(value: string): RobotDogId {
    if (!value || value.trim().length === 0) {
      throw new Error('RobotDogId cannot be empty')
    }

    return new RobotDogId(value)
  }

  public equals(other: RobotDogId): boolean {
    return this.value === other.value
  }

  public toString(): string {
    return this.value
  }
}
