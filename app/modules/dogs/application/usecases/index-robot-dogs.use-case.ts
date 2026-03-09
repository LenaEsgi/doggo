import { RobotDogRepository } from '../../domain/contracts/robot-dog.repository.js'
import { RobotDogOutput } from '../DTO/robot-dog.output.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export class IndexRobotDogsUseCase {
  constructor(private readonly robotDogRepository: RobotDogRepository) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<RobotDogOutput>> {
    logger.info({}, 'IndexRobotDogsUseCase started')

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)

    logger.info({ page, limit }, 'page and limit')

    const { data: dogs, meta } = await this.robotDogRepository.findAll({ page, limit })

    logger.info({ count: dogs.length }, 'IndexRobotDogsUseCase completed successfully')

    const dto: RobotDogOutput[] = dogs.map((dog) => ({
      id: dog.id.value,
      serialNumber: dog.serialNumber,
      name: dog.name,
      state: dog.state,
      batteryLevel: dog.batteryLevel,
      lastHeartbeat: dog.lastHeartbeat,
    }))

    return { data: dto, meta }
  }
}
