import { AddMissionStepUseCase } from '../contracts/add-mission-step.use-case.ts'
import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'
import { MissionRepository } from '../../domain/contracts/mission.repository.ts'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { inject } from '@adonisjs/core'

@inject()
export class AddMissionStepUseCaseImplementation implements AddMissionStepUseCase {
  constructor(private missionRepository: MissionRepository) {}
  async execute(dto: AddMissionStepDto): Promise<void> {
    const missionId = MissionId.fromString(dto.missionId)
    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(dto.missionId)
    }

    mission.addStep(dto.actionId, dto.parameters)

    await this.missionRepository.save(mission)
  }
}
