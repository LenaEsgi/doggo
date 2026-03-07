import { DomainError } from '../../../share/exceptions/domain-error.js'

export class InvalidMissionNotFountError extends DomainError {
  constructor(id: string) {
    super(`mission with id ${id} not found`)
  }
}
