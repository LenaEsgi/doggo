import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidRobotDogNameError extends DomainError {
  constructor(name: string) {
    super(`RobotDog name is invalid: "${name}"`)
  }
}
