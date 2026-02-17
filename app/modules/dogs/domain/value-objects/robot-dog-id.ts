import { randomUUID } from 'node:crypto'
import { InvalidRobotDogIdError } from '../exceptions/invalid-robot-dog-id.error.js'

export class RobotDogId {
  private constructor(public readonly value: string) {}

  public static generate(): RobotDogId {
    return new RobotDogId(randomUUID())
  }

  public static fromString(value: string): RobotDogId {
    if (!value || value.trim().length === 0) {
      throw new InvalidRobotDogIdError(value)
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
