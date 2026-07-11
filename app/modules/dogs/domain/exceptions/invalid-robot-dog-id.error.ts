import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotDogIdError extends DomainError {
  constructor(value: string) {
    super(`Invalid RobotDogId: ${value}`)
  }
}
