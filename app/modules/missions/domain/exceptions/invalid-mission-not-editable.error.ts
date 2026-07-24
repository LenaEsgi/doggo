import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionNotEditableError extends DomainError {
  readonly httpStatus = 422
  readonly code = 'MISSION_NOT_EDITABLE'

  constructor() {
    super('Mission cannot be modified while a run is active on at least one robot')
  }
}
