export class MissionOutputDto {
  constructor(
    public readonly id: string,
    // TODO: output properties
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}
}
