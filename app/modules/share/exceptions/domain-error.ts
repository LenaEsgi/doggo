export abstract class DomainError extends Error {
  readonly httpStatus: number = 400
  readonly code: string = 'DOMAIN_ERROR'

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
