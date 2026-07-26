import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissingBearerTokenError extends DomainError {
  constructor() {
    super('Authorization bearer token is missing')
  }
}
