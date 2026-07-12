import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotDogNameError extends DomainError {
  readonly httpStatus = 422
  readonly code = 'INVALID_ROBOT_DOG_NAME'

  constructor(name: string) {
    super(`RobotDog name is invalid: "${name}"`)
  }
}
