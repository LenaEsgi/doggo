import { ActionId } from './value-objects/action-id.js'
import { InvalidActionPropertyError } from '#app/modules/actions/domain/exceptions/invalid-action-property.error'
import { InvalidActionParametersError } from '#app/modules/actions/domain/exceptions/invalid-action-parameters.error'
import { InvalidFirmwareVersionError } from '#dogs/domain/exceptions/invalid-firmware-version.error'
import { isValidSemver } from '#app/modules/share/utils/semver'
import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

export default class Action {
  private constructor(
    private readonly _id: ActionId,
    private _code: string,
    private _name: string,
    private _slug: string,
    private _description: string | null,
    private _parameterSchema: ActionParameterSchema | null,
    private _isActive: boolean,
    private _minFirmwareVersion: string | null = null
  ) {}

  public static create(
    code: string,
    name: string,
    slug: string,
    description: string | null,
    parameterSchema: ActionParameterSchema | null = null,
    minFirmwareVersion: string | null = null
  ): Action {
    if (minFirmwareVersion !== null && !isValidSemver(minFirmwareVersion)) {
      throw new InvalidFirmwareVersionError(minFirmwareVersion)
    }

    return new Action(
      ActionId.generate(),
      code.toUpperCase(),
      name,
      slug,
      description ?? null,
      parameterSchema,
      true,
      minFirmwareVersion
    )
  }

  public static rehydrate(
    id: string,
    code: string,
    name: string,
    slug: string,
    description: string | null,
    parameterSchema: ActionParameterSchema | null = null,
    isActive: boolean = true,
    minFirmwareVersion: string | null = null
  ): Action {
    return new Action(
      ActionId.fromString(id),
      code,
      name,
      slug,
      description ?? null,
      parameterSchema,
      isActive,
      minFirmwareVersion
    )
  }

  // -------------------
  // Getters
  // -------------------

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

  public get parameterSchema(): ActionParameterSchema | null {
    return this._parameterSchema
  }

  public get isActive(): boolean {
    return this._isActive
  }

  public get minFirmwareVersion(): string | null {
    return this._minFirmwareVersion
  }

  // -------------------
  // Business
  // -------------------

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

  public updateCode(code: string): void {
    this._code = code.toUpperCase()
  }

  public updateDescription(description: string | null): void {
    this._description = description ?? null
  }

  public updateParameterSchema(schema: ActionParameterSchema | null): void {
    this._parameterSchema = schema
  }

  public activate(): void {
    this._isActive = true
  }

  public deactivate(): void {
    this._isActive = false
  }

  /**
   * Valide que paramsJson respecte le schema de cette action.
   * Si l'action n'a pas de schema, tout JSON valide est accepté.
   * Lance InvalidActionParametersError en cas d'échec.
   */
  public validateParameters(paramsJson: string): void {
    if (!this._parameterSchema) return

    let parsed: unknown
    try {
      parsed = JSON.parse(paramsJson)
    } catch {
      throw new InvalidActionParametersError('parameters', 'must be valid JSON')
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new InvalidActionParametersError('parameters', 'must be a JSON object')
    }

    const obj = parsed as Record<string, unknown>

    for (const field of this._parameterSchema.fields) {
      const value = obj[field.name]

      if (field.required && (value === undefined || value === null)) {
        throw new InvalidActionParametersError(field.name, 'is required')
      }

      if (value === undefined || value === null) continue

      if (field.type === 'number') {
        if (typeof value !== 'number') {
          throw new InvalidActionParametersError(field.name, `must be a number`)
        }
        if (field.min !== undefined && value < field.min) {
          throw new InvalidActionParametersError(field.name, `must be >= ${field.min}`)
        }
        if (field.max !== undefined && value > field.max) {
          throw new InvalidActionParametersError(field.name, `must be <= ${field.max}`)
        }
      }

      if (field.type === 'string' && typeof value !== 'string') {
        throw new InvalidActionParametersError(field.name, 'must be a string')
      }

      if (field.type === 'boolean' && typeof value !== 'boolean') {
        throw new InvalidActionParametersError(field.name, 'must be a boolean')
      }
    }
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
