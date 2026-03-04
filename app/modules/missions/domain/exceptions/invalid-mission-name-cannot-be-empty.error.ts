import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNameCannotBeEmptyError extends DomainError {
  readonly code = 'MISSION_NAME_EMPTY'

  constructor() {
    super('Mission name cannot be empty')
  }
}
