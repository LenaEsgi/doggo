export class CreateActionDto {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description?: string | null
  ) {}
}
