import { inject } from '@adonisjs/core'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

@inject()
export class GetActiveMissionRunUseCase {
  constructor(private readonly missionRunRepository: MissionRunRepository) {}

  async execute(dogId: string): Promise<MissionRun | null> {
    return this.missionRunRepository.findActiveRunByRobotDog(dogId)
  }
}
