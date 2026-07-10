import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionNotEditableError extends DomainError {
  constructor() {
    super('Mission cannot be modified while a run is active on at least one robot')
    this.name = 'MissionNotEditableError'
  }
}
