import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogNotFoundError extends DomainError {
  constructor(id: string) {
    super(`RobotDog with id ${id} not found`)
  }
}
