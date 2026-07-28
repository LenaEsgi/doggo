import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionSlugAlreadyExistsError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_SLUG_ALREADY_EXISTS'

  constructor(slug: string) {
    super('Action with slug ' + slug + ' already exist')
  }
}
