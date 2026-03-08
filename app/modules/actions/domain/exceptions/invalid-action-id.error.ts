import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidActionIdError extends DomainError {
  constructor(value: string) {
    super('The id <' + value + '> is not a valid Action identifier.')
    this.name = 'InvalidActionIdError'
  }
}
