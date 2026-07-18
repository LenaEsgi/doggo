import { Assert } from '@japa/assert'

type DomainErrorConstructor = abstract new (...args: never[]) => Error

declare module '@japa/assert' {
  interface Assert {
    throws(fn: () => void, errType: DomainErrorConstructor, message?: string): void
    throws(
      fn: () => void,
      constructor: DomainErrorConstructor,
      regExp: RegExp | string,
      message?: string
    ): void
    rejects(
      fn: () => Promise<unknown>,
      errType: DomainErrorConstructor,
      message?: string
    ): Promise<void>
    rejects(
      fn: () => Promise<unknown>,
      constructor: DomainErrorConstructor,
      regExp: RegExp | string,
      message?: string
    ): Promise<void>
  }
}
