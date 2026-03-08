import { ActionRepository } from '../../domain/contracts/action.repository.js'
import { DestroyActionDto } from '../dto/destroy-action.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'

@inject()
export class DestroyActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: DestroyActionDto): Promise<void> {
    logger.info({ actionId: dto.id }, 'Attempting to destroy action')

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      logger.warn({ actionId: dto.id }, 'Destroy action failed: Action not found')
      throw new ActionNotFoundError(actionId.value)
    }
    logger.debug({ actionId: actionId.value, code: action.code }, 'Deleting action from repository')
    await this.actionRepository.delete(actionId)
  }
}
