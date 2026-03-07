import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class InvalidMissionAlreadyRunningError extends DomainError {
  constructor() {
    super(
      'Mission isexport abstract class UniqueEntityId<T> {\n' +
        '  protected constructor(private readonly value: string) {\n' +
        "    if (!value) throw new Error('Id cannot be empty')\n" +
        '  }\n' +
        '\n' +
        '  toString() {\n' +
        '    return this.value\n' +
        '  }\n' +
        '} already running'
    )
  }
}
