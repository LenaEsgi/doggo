import { BaseTransformer } from '@adonisjs/core/transformers'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'

export default class MissionTransformer extends BaseTransformer<Mission> {
  toObject() {
    return {
      id: this.resource.id.value,
      name: this.resource.name,
      status: this.resource.status,
      userId: this.resource.userId
    }
  }
}
