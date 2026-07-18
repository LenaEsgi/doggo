import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import Action from '#app/modules/actions/domain/action.entity'

@inject()
export class IndexActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(params: PaginationDto): Promise<PaginatedResult<Action>> {
    logger.info('IndexActionUseCase started', { params })
    return await this.actionRepository.index(params)
  }
}
