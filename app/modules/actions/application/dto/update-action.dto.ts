export class UpdateActionDto {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly slug?: string,
    public readonly description?: string | null
  ) {}
}
