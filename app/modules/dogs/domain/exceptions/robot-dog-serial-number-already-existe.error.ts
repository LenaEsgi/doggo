import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogSerialNumberAlreadyExistsError extends DomainError {
  constructor(serialNumber: string) {
    super(`Robot dog with serial number ${serialNumber} already exists.`)
  }
}
