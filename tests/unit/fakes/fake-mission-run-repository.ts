import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionRunStatus } from '#app/modules/missions/domain/enums/mission-run-status'

export class FakeMissionRunRepository implements MissionRunRepository {
  public runs: MissionRun[] = []

  async findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) =>
          r.missionId.value === missionId &&
          r.robotDogId.value === robotDogId &&
          r.status === MissionRunStatus.RUNNING
      ) ?? null
    )
  }

  async findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null> {
    return (
      this.runs.find(
        (r) => r.robotDogId.value === robotDogId && r.status === MissionRunStatus.RUNNING
      ) ?? null
    )
  }

  async hasActiveRunForMission(missionId: string): Promise<boolean> {
    return this.runs.some(
      (r) => r.missionId.value === missionId && r.status === MissionRunStatus.RUNNING
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
