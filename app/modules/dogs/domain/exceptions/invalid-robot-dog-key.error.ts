import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotDogKeyError extends DomainError {
  readonly httpStatus = 403
  readonly code = 'INVALID_ROBOT_DOG_KEY'

  constructor() {
    super('Invalid robot dog key')
  }
}
