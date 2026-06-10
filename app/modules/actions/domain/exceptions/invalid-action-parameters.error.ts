import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidActionParametersError extends DomainError {
  constructor(fieldName: string, reason: string) {
    super(`Invalid parameter "${fieldName}": ${reason}`)
    this.name = 'InvalidActionParametersError'
  }
}
