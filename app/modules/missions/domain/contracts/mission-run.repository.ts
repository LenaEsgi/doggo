import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import type { Tx } from '#app/modules/share/domain/contracts/unit-of-work'

export abstract class MissionRunRepository {
  abstract listActiveRuns(): Promise<MissionRun[]>
  abstract findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null>
  abstract findActiveRunForUpdate(
    missionId: string,
    robotDogId: string,
    tx: Tx
  ): Promise<MissionRun | null>
  abstract findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null>
  abstract findActiveRunByRobotDogForUpdate(robotDogId: string, tx: Tx): Promise<MissionRun | null>
  abstract hasActiveRunForMission(missionId: string): Promise<boolean>
  abstract save(run: MissionRun, tx?: Tx): Promise<void>
}
