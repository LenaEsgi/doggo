import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotDogNameError extends DomainError {
  constructor(name: string) {
    super(`RobotDog name is invalid: "${name}"`)
  }
}
