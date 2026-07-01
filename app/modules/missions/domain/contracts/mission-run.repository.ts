import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

export abstract class MissionRunRepository {
  abstract findActiveRun(missionId: string, robotDogId: string): Promise<MissionRun | null>
  abstract findActiveRunByRobotDog(robotDogId: string): Promise<MissionRun | null>
  abstract hasActiveRunForMission(missionId: string): Promise<boolean>
  abstract save(run: MissionRun): Promise<void>
}
