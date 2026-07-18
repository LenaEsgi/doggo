import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import type { Tx } from '#app/modules/share/domain/contracts/unit-of-work'
import { type MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

const ACTIVE_STATUSES: MissionRunStatus[] = [MissionRunStatus.PENDING, MissionRunStatus.RUNNING]

export class FakeMissionRunRepository implements MissionRunRepository {
  public runs: MissionRun[] = []

  async findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) =>
          r.missionId.value === missionId &&
          r.robotDogId.value === robotDogId &&
          ACTIVE_STATUSES.includes(r.status)
      ) ?? null
    )
  }

  async findActiveRunForUpdate(
    missionId: string,
    robotDogId: string,
    _tx: Tx
  ): Promise<MissionRun | null> {
    return this.findActiveRun(missionId, robotDogId)
  }

  async findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) => r.robotDogId.value === robotDogId && ACTIVE_STATUSES.includes(r.status)
      ) ?? null
    )
  }

  async hasActiveRunForMission(missionId: string): Promise<boolean> {
    return this.runs.some(
      (r) => r.missionId.value === missionId && ACTIVE_STATUSES.includes(r.status)
    )
  }

  async save(run: MissionRun): Promise<void> {
    const index = this.runs.findIndex((r) => r.id.equals(run.id))
    if (index >= 0) {
      this.runs[index] = run
    } else {
      this.runs.push(run)
    }
  }
}
