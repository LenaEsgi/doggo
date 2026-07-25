import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import type { MissionWithCreatorDto } from '#app/modules/missions/application/dto/mission-with-creator.dto'

@inject()
export class ShowMissionUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private userGateway: UserGateway
  ) {}

  async execute(id: string): Promise<MissionWithCreatorDto> {
    const missionId = MissionId.fromString(id)

    const mission = await this.missionRepository.findById(missionId)

    if (!mission) {
      throw new MissionNotFoundError(id)
    }
    logger.info('ShowMissionUseCase started', { id })

    const creator = await this.userGateway.findBy(mission.userId)

    return { mission, creator }
  }
}
