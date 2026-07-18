import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { CreateActionDto } from '#app/modules/actions/application/dto/create-action.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import Action from '#app/modules/actions/domain/action.entity'

@inject()
export class CreateActionUseCase {
  constructor(private actionRepository: ActionRepository) {}

  async execute(dto: CreateActionDto) {
    logger.info({ code: dto.code, name: dto.name }, 'CreateAction started')

    const existing = await this.actionRepository.findByCode(dto.code)

    if (existing) {
      logger.warn({ code: dto.code }, 'Action creation failed: code already exists')
      throw new ActionAlreadyExistsError(dto.code)
    }

    const action = Action.create(
      dto.code,
      dto.name,
      dto.slug,
      dto.description ?? null,
      dto.parameterSchema ?? null
    )
    logger.debug({ actionId: action.id.value }, 'Domain entity instantiated')

    await this.actionRepository.save(action)
  }
}
