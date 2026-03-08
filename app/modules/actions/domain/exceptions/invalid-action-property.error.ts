import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidActionPropertyError extends DomainError {
  constructor(property: string, message: string) {
    super(`Invalid ${property}: ${message}`)
    this.name = 'InvalidActionPropertyError'
  }
}
