import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidFirmwareVersionError extends DomainError {
  readonly code = 'INVALID_FIRMWARE_VERSION'

  constructor(version: string) {
    super(`Firmware version must be in "major.minor.patch" format. Received: ${version}`)
  }
}
