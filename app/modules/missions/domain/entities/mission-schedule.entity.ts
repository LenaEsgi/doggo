import { type DateTime } from 'luxon'
import { MissionScheduleId } from '#app/modules/missions/domain/value-objects/mission-schedule-id'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { InvalidMissionScheduleDaysOfWeekError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-days-of-week.error'
import { InvalidMissionScheduleHourError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-hour.error'
import { InvalidMissionScheduleMinuteError } from '#app/modules/missions/domain/exceptions/invalid-mission-schedule-minute.error'

export default class MissionSchedule {
  private constructor(
    private readonly _id: MissionScheduleId,
    private readonly _missionId: MissionId,
    private readonly _robotDogId: RobotDogId,
    private _daysOfWeek: number[],
    private _hour: number,
    private _minute: number,
    private _enabled: boolean
  ) {}

  public static create(
    missionId: MissionId,
    robotDogId: RobotDogId,
    daysOfWeek: number[],
    hour: number,
    minute: number
  ): MissionSchedule {
    const normalizedDays = MissionSchedule.normalizeDaysOfWeek(daysOfWeek)
    MissionSchedule.validateHour(hour)
    MissionSchedule.validateMinute(minute)

    return new MissionSchedule(
      MissionScheduleId.generate(),
      missionId,
      robotDogId,
      normalizedDays,
      hour,
      minute,
      true
    )
  }

  public static rehydrate(
    id: string,
    missionId: string,
    robotDogId: string,
    daysOfWeek: number[],
    hour: number,
    minute: number,
    enabled: boolean
  ): MissionSchedule {
    return new MissionSchedule(
      MissionScheduleId.fromString(id),
      MissionId.fromString(missionId),
      RobotDogId.fromString(robotDogId),
      daysOfWeek,
      hour,
      minute,
      enabled
    )
  }

  public update(daysOfWeek: number[], hour: number, minute: number): void {
    const normalizedDays = MissionSchedule.normalizeDaysOfWeek(daysOfWeek)
    MissionSchedule.validateHour(hour)
    MissionSchedule.validateMinute(minute)

    this._daysOfWeek = normalizedDays
    this._hour = hour
    this._minute = minute
  }

  public enable(): void {
    this._enabled = true
  }

  public disable(): void {
    this._enabled = false
  }

  public isDueAt(now: DateTime): boolean {
    return (
      this._enabled &&
      this._daysOfWeek.includes(now.weekday) &&
      now.hour === this._hour &&
      now.minute === this._minute
    )
  }

  private static normalizeDaysOfWeek(daysOfWeek: number[]): number[] {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      throw new InvalidMissionScheduleDaysOfWeekError('Days of week cannot be empty')
    }

    if (daysOfWeek.some((day) => day < 1 || day > 7)) {
      throw new InvalidMissionScheduleDaysOfWeekError(
        'Days of week must be between 1 (Monday) and 7 (Sunday)'
      )
    }

    return [...new Set(daysOfWeek)].sort((a, b) => a - b)
  }

  private static validateHour(hour: number): void {
    if (hour < 0 || hour > 23) {
      throw new InvalidMissionScheduleHourError(hour)
    }
  }

  private static validateMinute(minute: number): void {
    if (minute < 0 || minute > 59) {
      throw new InvalidMissionScheduleMinuteError(minute)
    }
  }

  get id(): MissionScheduleId {
    return this._id
  }

  get missionId(): MissionId {
    return this._missionId
  }

  get robotDogId(): RobotDogId {
    return this._robotDogId
  }

  get daysOfWeek(): number[] {
    return [...this._daysOfWeek]
  }

  get hour(): number {
    return this._hour
  }

  get minute(): number {
    return this._minute
  }

  get enabled(): boolean {
    return this._enabled
  }
}
