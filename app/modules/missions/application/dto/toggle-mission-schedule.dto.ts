export class ToggleMissionScheduleDto {
  constructor(
    public readonly id: string,
    public readonly enabled: boolean
  ) {}
}
