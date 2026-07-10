import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'
import MissionRunStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-run-step.transformer'

export default class MissionRunTransformer extends BaseTransformer<MissionRun> {
  toObject() {
    return {
      id: this.resource.id.value,
      missionId: this.resource.missionId.value,
      robotDogId: this.resource.robotDogId.value,
      status: this.resource.status,
      startedAt: this.resource.startedAt,
      endedAt: this.resource.endedAt,
      runSteps: this.resource.runSteps.map((step) =>
        new MissionRunStepTransformer(step).toObject()
      ),
    }
  }
}
