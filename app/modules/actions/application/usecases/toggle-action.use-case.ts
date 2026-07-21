import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ToggleActionDto } from '#app/modules/actions/application/dto/toggle-action.dto'

@inject()
export class ToggleActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: ToggleActionDto): Promise<void> {
    logger.info('ToggleActionUseCase started', { dto })

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    if (dto.isActive) {
      action.activate()
    } else {
      action.deactivate()
    }

    await this.actionRepository.save(action)
  }
}
