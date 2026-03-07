import { MissionStatus } from '#app/modules/missions/domain/enums/mission-status'
import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionNotEditableError extends DomainError {
  constructor(status: MissionStatus) {
    super(`Mission cannot be modified while in status "${status}"`)
    this.name = 'MissionNotEditableError'
  }
}
