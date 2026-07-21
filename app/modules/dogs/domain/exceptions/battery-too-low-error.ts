import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class BatteryTooLowError extends DomainError {
  readonly code = 'BATTERY_TOO_LOW'

  constructor(public readonly level: number) {
    super(`Battery level too low: ${level}%`, { level })
  }
}
