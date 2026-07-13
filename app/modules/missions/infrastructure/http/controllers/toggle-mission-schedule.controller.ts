import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { ToggleMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/toggle-mission-schedule.validator'
import { ToggleMissionScheduleUseCase } from '#app/modules/missions/application/usecases/toggle-mission-schedule.use-case'
import { ToggleMissionScheduleDto } from '#app/modules/missions/application/dto/toggle-mission-schedule.dto'

@inject()
export default class ToggleMissionScheduleController {
  constructor(private toggleUseCase: ToggleMissionScheduleUseCase) {}

  public async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    const payload = await request.validateUsing(ToggleMissionScheduleValidator)
    await this.toggleUseCase.execute(
      new ToggleMissionScheduleDto(params.scheduleId, payload.enabled)
    )

    return response.ok({ message: 'Mission schedule toggled successfully' })
  }
}
