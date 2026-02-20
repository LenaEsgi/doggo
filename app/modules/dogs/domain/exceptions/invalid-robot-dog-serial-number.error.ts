import { DomainError } from './domain-error.js'

export class InvalidRobotDogSerialNumberError extends DomainError {
  constructor() {
    super('RobotDog serial number is required')
    this.name = 'InvalidRobotDogSerialNumberError'
  }
}
