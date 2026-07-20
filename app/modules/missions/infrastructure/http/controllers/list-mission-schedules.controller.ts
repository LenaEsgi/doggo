import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ListMissionSchedulesByMissionUseCase } from '#app/modules/missions/application/usecases/list-mission-schedules-by-mission.use-case'
import MissionScheduleTransformer from '#app/modules/missions/infrastructure/http/transformers/mission-schedule.transformer'

@inject()
export default class ListMissionSchedulesController {
  constructor(private listUseCase: ListMissionSchedulesByMissionUseCase) {}

  public async handle({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('viewSchedule', params.id)

    const schedules = await this.listUseCase.execute(params.id)

    return serialize(MissionScheduleTransformer.transform(schedules))
  }
}
