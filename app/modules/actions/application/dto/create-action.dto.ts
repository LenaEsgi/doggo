import type { ActionParameterSchema } from '#app/modules/actions/domain/value-objects/action-parameter-schema'

export class CreateActionDto {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description?: string | null,
    public readonly parameterSchema?: ActionParameterSchema | null,
    public readonly minFirmwareVersion?: string | null
  ) {}
}
