import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { RemoveMissionStepUseCase } from '#app/modules/missions/application/contracts/remove-mission-step.use-case'
import { RemoveMissionStepDto } from '#app/modules/missions/application/dto/remove-mission-step.dto'
import { MissionStepId } from '#app/modules/missions/domain/value-objects/mission-step-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'

@inject()
export default class RemoveMissionStepImplementation implements RemoveMissionStepUseCase {
  constructor(private readonly missionRepository: MissionRepository) {}

  public async execute(dto: RemoveMissionStepDto): Promise<void> {
    const mission = await this.missionRepository.findById(
      MissionId.fromString(dto.missionId)
    )

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    mission.removeStep(MissionStepId.fromString(dto.stepId))

    await this.missionRepository.save(mission)
  }
}
