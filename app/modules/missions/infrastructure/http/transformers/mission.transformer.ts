import { BaseTransformer } from '@adonisjs/core/transformers'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'
import type { User } from '#users/domain/user.entity'
import MissionStepTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-step.transformer'

export default class MissionTransformer extends BaseTransformer<Mission> {
  constructor(
    resource: Mission,
    private readonly creator?: User | null
  ) {
    super(resource)
  }

  toObject() {
    return {
      id: this.resource.id.value,
      name: this.resource.name,
      userId: this.resource.userId,
      stepsCount: this.resource.stepsCount,
      robotDogIds: this.resource.robotDogIds.map((id) => id.value),
      missionSteps: MissionStepTransformer.transform(this.resource.missionSteps),
      createdAt: this.resource.createdAt?.toISO() ?? null,
      creator: this.creator
        ? {
            firstname: this.creator.firstname,
            lastname: this.creator.lastname,
            email: this.creator.email,
          }
        : null,
    }
  }
}
