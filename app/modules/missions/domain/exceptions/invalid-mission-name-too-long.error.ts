import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNameTooLongError extends DomainError {
  readonly code = 'MISSION_NAME_TOO_LONG'

  constructor(max: number) {
    super(`Mission name cannot exceed ${max} characters`)
  }
}
