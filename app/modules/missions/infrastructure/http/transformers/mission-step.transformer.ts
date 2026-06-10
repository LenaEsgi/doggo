import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'

export default class MissionStepTransformer extends BaseTransformer<MissionStep> {
  toObject() {
    return {
      id: this.resource.id.value,
      actionId: this.resource.actionId,
      sequenceOrder: this.resource.order,
      parameters: this.resource.parameters,
      status: this.resource.status,
    }
  }
}
