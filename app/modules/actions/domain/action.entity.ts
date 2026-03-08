import { ActionId } from './value-objects/action-id.js'
import { InvalidActionPropertyError } from '#app/modules/actions/domain/exceptions/invalid-action-property.error'

export default class Action {
  private constructor(
    private readonly _id: ActionId,
    private readonly _code: string,
    private _name: string,
    private _slug: string,
    private _description: string | null
  ) {}

  public static create(
    code: string,
    name: string,
    slug: string,
    description: string | null
  ): Action {
    return new Action(ActionId.generate(), code.toUpperCase(), name, slug, description ?? null)
  }

  public static rehydrate(
    id: string,
    code: string,
    name: string,
    slug: string,
    description: string | null
  ): Action {
    return new Action(ActionId.fromString(id), code, name, slug, description ?? null)
  }

  public get id(): ActionId {
    return this._id
  }

  public get code(): string {
    return this._code
  }

  public get name(): string {
    return this._name
  }

  public get slug(): string {
    return this._slug
  }

  public get description(): string | null {
    return this._description
  }

  public updateName(name: string): void {
    const cleaned = name.trim()
    if (cleaned.length < 1 || cleaned.length > 50) {
      throw new InvalidActionPropertyError('name', 'must be between 1 and 50 characters')
    }
    this._name = cleaned
  }

  public updateSlug(slug: string): void {
    this._slug = this.validateString(slug, 'slug').toLowerCase()
  }

  public updateDescription(description: string | null): void {
    this._description = description ?? null
  }

  private validateString(value: string, fieldName: string): string {
    const cleaned = value.trim()

    if (/\s/.test(cleaned)) {
      throw new InvalidActionPropertyError(fieldName, 'should not contain spaces')
    }

    if (cleaned.length < 1 || cleaned.length > 50) {
      throw new InvalidActionPropertyError(fieldName, 'must be between 1 and 50 characters')
    }

    return cleaned
  }
}
