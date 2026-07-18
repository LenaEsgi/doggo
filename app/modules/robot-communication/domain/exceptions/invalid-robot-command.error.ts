import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotCommandError extends DomainError {
  readonly httpStatus = 422
  readonly code = 'INVALID_ROBOT_COMMAND'

  constructor(message: string) {
    super(message)
    this.name = 'InvalidRobotCommandError'
  }
}
