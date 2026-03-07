import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidRobotDogIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid RobotDogId: ${value}`)
  }
}
