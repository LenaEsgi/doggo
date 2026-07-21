export abstract class DomainError extends Error {
  readonly httpStatus: number = 400
  readonly code: string = 'DOMAIN_ERROR'
  readonly details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = new.target.name
    this.details = details
  }
}
