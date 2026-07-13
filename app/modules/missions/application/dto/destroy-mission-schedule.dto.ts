export class DestroyMissionScheduleDto {
  constructor(
    public readonly id: string,
    public readonly missionId: string
  ) {}
}
