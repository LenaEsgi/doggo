import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { ShowActionDto } from '#app/modules/actions/application/dto/show-action.dto'
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
