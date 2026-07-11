import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidRobotDogSerialNumberError extends DomainError {
  constructor() {
    super('RobotDog serial number is required')
    this.name = 'InvalidRobotDogSerialNumberError'
  }
}
