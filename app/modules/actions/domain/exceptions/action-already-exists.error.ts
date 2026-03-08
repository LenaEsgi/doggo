import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super('Action with code ' + code + ' already exist')
    this.name = 'ActionAlreadyExistsError'
  }
}
