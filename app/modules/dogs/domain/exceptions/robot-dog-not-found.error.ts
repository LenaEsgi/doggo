import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogNotFoundError extends DomainError {
  readonly httpStatus = 404
  readonly code = 'ROBOT_DOG_NOT_FOUND'

  constructor(id: string) {
    super(`RobotDog with id ${id} not found`)
  }
}
