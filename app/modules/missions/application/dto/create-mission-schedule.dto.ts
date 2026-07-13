export class CreateMissionScheduleDto {
  constructor(
    public readonly missionId: string,
    public readonly robotDogId: string,
    public readonly daysOfWeek: number[],
    public readonly hour: number,
    public readonly minute: number
  ) {}
}
