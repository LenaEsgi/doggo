import { BaseTransformer } from '@adonisjs/core/transformers'
import type MissionSchedule from '#app/modules/missions/domain/entities/mission-schedule.entity'

export default class MissionScheduleTransformer extends BaseTransformer<MissionSchedule> {
  toObject() {
    return {
      id: this.resource.id.value,
      missionId: this.resource.missionId.value,
      robotDogId: this.resource.robotDogId.value,
      daysOfWeek: this.resource.daysOfWeek,
      hour: this.resource.hour,
      minute: this.resource.minute,
      enabled: this.resource.enabled,
    }
  }
}
