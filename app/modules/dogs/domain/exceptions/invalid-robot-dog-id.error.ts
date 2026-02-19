import { DomainError } from './domain-error.js'

export class InvalidRobotDogIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid RobotDogId: "${value}"`)
  }
}
