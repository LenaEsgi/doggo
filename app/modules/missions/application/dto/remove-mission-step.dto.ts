export class RemoveMissionStepDto {
  constructor(
    public readonly missionId: string,
    public readonly stepId: string
  ) {}
}
