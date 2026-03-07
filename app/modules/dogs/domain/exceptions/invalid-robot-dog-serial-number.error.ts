import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidRobotDogSerialNumberError extends DomainError {
  constructor() {
    super('RobotDog serial number is required')
    this.name = 'InvalidRobotDogSerialNumberError'
  }
}
