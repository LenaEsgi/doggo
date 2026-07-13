import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { DestroyMissionScheduleUseCase } from '#app/modules/missions/application/usecases/destroy-mission-schedule.use-case'
import { DestroyMissionScheduleDto } from '#app/modules/missions/application/dto/destroy-mission-schedule.dto'

@inject()
export default class DestroyMissionScheduleController {
  constructor(private destroyUseCase: DestroyMissionScheduleUseCase) {}

  public async handle({ params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    await this.destroyUseCase.execute(
      new DestroyMissionScheduleDto(params.scheduleId, params.missionId)
    )

    return response.status(200)
  }
}
