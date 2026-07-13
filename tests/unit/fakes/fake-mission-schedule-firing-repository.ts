import { type DateTime } from 'luxon'
import { type MissionScheduleFiringRepository } from '#app/modules/missions/domain/contracts/mission-schedule-firing.repository'
import { type MissionScheduleFiringOutcome } from '#app/modules/missions/domain/enums/mission-schedule-firing-outcome'

export class FakeMissionScheduleFiringRepository implements MissionScheduleFiringRepository {
  public claimed = new Set<string>()
  public outcomes: {
    missionScheduleId: string
    firedForMinute: DateTime
    outcome: MissionScheduleFiringOutcome
    missionRunId: string | null
  }[] = []

  private key(missionScheduleId: string, firedForMinute: DateTime): string {
    return `${missionScheduleId}:${firedForMinute.toMillis()}`
  }

  async tryClaim(missionScheduleId: string, firedForMinute: DateTime): Promise<boolean> {
    const key = this.key(missionScheduleId, firedForMinute)
    if (this.claimed.has(key)) {
      return false
    }
    this.claimed.add(key)
    return true
  }

  async recordOutcome(
    missionScheduleId: string,
    firedForMinute: DateTime,
    outcome: MissionScheduleFiringOutcome,
    missionRunId: string | null
  ): Promise<void> {
    this.outcomes.push({ missionScheduleId, firedForMinute, outcome, missionRunId })
  }
}
