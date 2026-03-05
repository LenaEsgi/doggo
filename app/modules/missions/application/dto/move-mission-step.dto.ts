
export class MoveMissionStepDto {
  constructor(
    public readonly missionId: string,
    public readonly stepId: string,
    public readonly newOrder: number,
  ) {}
}
