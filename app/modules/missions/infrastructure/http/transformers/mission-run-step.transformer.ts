import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionRunStep from '#app/modules/missions/domain/entities/mission-run-step.entity'

export default class MissionRunStepTransformer extends BaseTransformer<MissionRunStep> {
  toObject() {
    return {
      id: this.resource.id.value,
      stepId: this.resource.stepId.value,
      status: this.resource.status,
    }
  }
}
