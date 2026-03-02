import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidBatteryLevelError extends DomainError {
  readonly code = 'INVALID_BATTERY_LEVEL'

  constructor(level: number) {
    super(`Battery level must be between 0 and 100. Received: ${level}`)
  }
}
