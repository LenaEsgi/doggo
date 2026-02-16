export class BatteryTooLowError extends Error {
  readonly code = 'BATTERY_TOO_LOW'

  constructor(level: string) {
    super(`Battery level too low: ${level}%`)
  }
}
