import { randomUUID } from 'node:crypto'
import { InvalidRobotDogIdError } from '../exceptions/invalid-robot-dog-id.error.js'

export class RobotDogId {
  private constructor(public readonly value: string) {}

  private static UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  public static generate(): RobotDogId {
    return new RobotDogId(randomUUID())
  }

  public static fromString(value: string): RobotDogId {
    if (!value || value.trim().length === 0) {
      throw new InvalidRobotDogIdError(value)
    }

    if (!RobotDogId.UUID_REGEX.test(value)) {
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
