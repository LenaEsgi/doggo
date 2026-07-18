export class CreateMissionDto {
  constructor(
    public readonly name: string,
    public readonly userId: string
  ) {}
}
