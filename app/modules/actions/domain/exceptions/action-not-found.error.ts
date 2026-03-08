import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionNotFoundError extends DomainError {
  constructor(id: string) {
    super('Action with id ' + id + ' not found')
    this.name = 'ActionNotFoundError'
  }
}
