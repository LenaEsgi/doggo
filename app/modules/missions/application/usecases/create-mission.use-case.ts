import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { CreateMissionDto } from '#app/modules/missions/application/dto/create-mission.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'

@inject()
export class CreateMissionUseCase {
  constructor(private missionRepository: MissionRepository) {}

  async execute(dto: CreateMissionDto): Promise<{ id: string }> {
    logger.info('CreateMissionUseCase started', { dto })

    const mission = Mission.create(dto.name, dto.userId)
    await this.missionRepository.save(mission)

    return { id: mission.id.value }
  }
}
