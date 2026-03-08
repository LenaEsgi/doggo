import { ActionRepository } from '../../domain/contracts/action.repository.js'
import { ShowActionDto } from '../dto/show-action.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import Action from '#app/modules/actions/domain/action.entity'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'

@inject()
export class ShowActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: ShowActionDto): Promise<Action> {
    logger.info('ShowActionUseCase started', { dto })

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    return action
  }
}
