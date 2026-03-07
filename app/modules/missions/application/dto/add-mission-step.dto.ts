
export class AddMissionStepDto {
  constructor(
    public readonly missionId: string,
    public readonly actionId: string,
    public readonly parameters: string,
  ) {}
}
