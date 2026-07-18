import { type DateTime } from 'luxon'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export abstract class MissionScheduleFiringRepository {
  abstract tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean>
  abstract recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void>
}
