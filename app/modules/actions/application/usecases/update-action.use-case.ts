import { ActionRepository } from '../../domain/contracts/action.repository.js'
import { UpdateActionDto } from '../dto/update-action.dto.js'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'

@inject()
export class UpdateActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: UpdateActionDto): Promise<void> {
    logger.info('UpdateActionUseCase started', { dto })

    // 1. Fetch from repository
    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    // 2. Apply domain logic
    if (dto.name) action.updateName(dto.name)
    if (dto.slug) action.updateSlug(dto.slug)

    if (dto.description !== undefined) {
      action.updateDescription(dto.description)
    }
    if (dto.parameterSchema !== undefined) {
      action.updateParameterSchema(dto.parameterSchema ?? null)
    }
    // 3. Save to repository
    await this.actionRepository.save(action)
  }
}
