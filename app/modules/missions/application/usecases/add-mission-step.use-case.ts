import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'
import { MissionRepository } from '../../domain/contracts/mission.repository.ts'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'

@inject()
export class AddMissionStepUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private missionRunRepository: MissionRunRepository
  ) {}

  async execute(dto: AddMissionStepDto): Promise<void> {
    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.addStep(dto.actionId, dto.parameters, hasActiveRun)

    await this.missionRepository.save(mission)
  }
}
