import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class ActionParameterSchemaLockedError extends DomainError {
  readonly httpStatus = 409
  readonly code = 'ACTION_PARAMETER_SCHEMA_LOCKED'

  constructor(id: string) {
    super(
      'Action with id ' + id + ' is already used by a mission step, its parameterSchema cannot be changed'
    )
  }
}
