import { BaseTransformer } from '@adonisjs/core/transformers'
import MissionStep from '#app/modules/missions/domain/entities/mission-step.entity'

export default class MissionStepTransformer extends BaseTransformer<MissionStep> {
  toObject() {
    return {
      id: this.resource.id.value,
      parameters: this.resource.parameters,
      status: this.resource.status,
    }
  }
}
