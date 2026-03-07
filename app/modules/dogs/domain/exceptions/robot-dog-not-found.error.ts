import { DomainError } from '../../../share/exceptions/domain-error.js'

export class RobotDogNotFoundError extends DomainError {
  constructor(id: string) {
    super(`RobotDog with id ${id} not found`)
  }
}
