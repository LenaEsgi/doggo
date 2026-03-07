import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionStepOrderError extends DomainError {
  constructor(order?: number) {
    const message = order !== undefined
      ? `MissionStep order is invalid: ${order}`
      : 'MissionStep order is invalid'

    super(message)
    this.name = 'InvalidMissionStepOrderException'
  }
}
