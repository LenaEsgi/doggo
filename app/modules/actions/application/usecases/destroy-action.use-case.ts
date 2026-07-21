import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { DestroyActionDto } from '#app/modules/actions/application/dto/destroy-action.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'

@inject()
export class DestroyActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: DestroyActionDto): Promise<void> {
    logger.info({ actionId: dto.id }, 'Attempting to deactivate action')

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      logger.warn({ actionId: dto.id }, 'Deactivate action failed: Action not found')
      throw new ActionNotFoundError(actionId.value)
    }

    action.deactivate()
    await this.actionRepository.save(action)
  }
}
