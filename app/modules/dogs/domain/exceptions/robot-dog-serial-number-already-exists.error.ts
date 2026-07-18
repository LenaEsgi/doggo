import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class RobotDogSerialNumberAlreadyExistsError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ROBOT_DOG_SERIAL_NUMBER_ALREADY_EXISTS'

  constructor(serialNumber: string) {
    super(`Robot dog with serial number ${serialNumber} already exists.`)
  }
}
