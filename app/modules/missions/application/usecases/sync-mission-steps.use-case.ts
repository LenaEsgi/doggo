import { inject } from '@adonisjs/core'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import type { SyncMissionStepsDto } from '#app/modules/missions/application/dto/sync-mission-steps.dto'

@inject()
export class SyncMissionStepsUseCase {
  constructor(private readonly missionRepository: MissionRepository) {}

  async execute(dto: SyncMissionStepsDto): Promise<Mission> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    mission.syncSteps(dto.steps)
    await this.missionRepository.save(mission)

    return mission
  }
}
