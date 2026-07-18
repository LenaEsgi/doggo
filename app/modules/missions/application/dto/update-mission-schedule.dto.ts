export class UpdateMissionScheduleDto {
  constructor(
    public readonly id: string,
    public readonly missionId: string,
    public readonly daysOfWeek: number[],
    public readonly hour: number,
    public readonly minute: number
  ) {}
}
