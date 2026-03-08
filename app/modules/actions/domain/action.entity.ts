import { ActionId } from './value-objects/action-id.js'

export default class Action {
  private constructor(
    public readonly id: ActionId,
    public readonly code: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null
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
}
