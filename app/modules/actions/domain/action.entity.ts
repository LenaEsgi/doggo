import { ActionId } from './value-objects/action-id.js'

export default class Action {
  private constructor(
    private readonly _id: ActionId,
    private readonly _code: string,
    private readonly _name: string,
    private readonly _slug: string,
    private readonly _description: string | null
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
}
