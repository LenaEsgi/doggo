import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotCommandError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRobotCommandError'
  }
}
