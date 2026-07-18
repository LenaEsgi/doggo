import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { RemoveMissionStepDto } from '#app/modules/missions/application/dto/remove-mission-step.dto'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'

@inject()
export default class RemoveMissionStep {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  public async execute(dto: RemoveMissionStepDto): Promise<void> {
    const mission = await this.missionRepository.findById(MissionId.fromString(dto.missionId))

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    const hasActiveRun = await this.missionRunRepository.hasActiveRunForMission(dto.missionId)
    mission.removeStep(MissionStepId.fromString(dto.stepId), hasActiveRun)

    await this.missionRepository.save(mission)
  }
}
