import { ActionRepository } from '#app/modules/actions/domain/contracts/action.repository'
import { UpdateActionDto } from '#app/modules/actions/application/dto/update-action.dto'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { ActionId } from '#app/modules/actions/domain/value-objects/action-id'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import { ActionParameterSchemaLockedError } from '#app/modules/actions/domain/exceptions/action-parameter-schema-locked.error'
import { MissionStepUsageGateway } from '#app/modules/actions/domain/contracts/mission-step-usage.gateway'

@inject()
export class UpdateActionUseCase {
  constructor(
    private actionRepository: ActionRepository,
    private missionStepUsageGateway: MissionStepUsageGateway
  ) {}

  async execute(dto: UpdateActionDto): Promise<void> {
    logger.info('UpdateActionUseCase started', { dto })

    const actionId = ActionId.fromString(dto.id)
    const action = await this.actionRepository.findById(actionId)

    if (!action) {
      throw new ActionNotFoundError(actionId.value)
    }

    if (dto.code) {
      const normalizedCode = dto.code.toUpperCase()
      if (normalizedCode !== action.code) {
        const existing = await this.actionRepository.findByCode(dto.code)
        if (existing && existing.id.value !== action.id.value) {
          throw new ActionAlreadyExistsError(dto.code)
        }
      }
      action.updateCode(dto.code)
    }

    if (dto.name) action.updateName(dto.name)
    if (dto.slug) action.updateSlug(dto.slug)

    if (dto.description !== undefined) {
      action.updateDescription(dto.description)
    }

    if (dto.parameterSchema !== undefined) {
      const isUsed = await this.missionStepUsageGateway.isActionUsed(action.id.value)
      if (isUsed) {
        throw new ActionParameterSchemaLockedError(action.id.value)
      }
      action.updateParameterSchema(dto.parameterSchema ?? null)
    }

    await this.actionRepository.save(action)
  }
}
