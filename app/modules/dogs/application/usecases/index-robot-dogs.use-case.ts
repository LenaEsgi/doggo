import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { RobotDog } from '#dogs/domain/robot-dog.entity'

@inject()
export class IndexRobotDogsUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<RobotDog>> {
    logger.info({}, 'IndexRobotDogsUseCase started')

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)

    logger.info({ page, limit }, 'page and limit')

    const { data, meta } = await this.robotDogRepository.findAll({ page, limit })

    logger.info({ count: data.length }, 'IndexRobotDogsUseCase completed successfully')

    return { data, meta }
  }
}
