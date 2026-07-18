import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { UpdateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/update-mission-schedule.validator'
import { UpdateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/update-mission-schedule.use-case'
import { UpdateMissionScheduleDto } from '#app/modules/missions/application/dto/update-mission-schedule.dto'

@inject()
export default class UpdateMissionScheduleController {
  constructor(private updateUseCase: UpdateMissionScheduleUseCase) {}

  public async handle({ request, params, response, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('manageSchedule', params.missionId)

    const payload = await request.validateUsing(UpdateMissionScheduleValidator)
    await this.updateUseCase.execute(
      new UpdateMissionScheduleDto(
        params.scheduleId,
        params.missionId,
        payload.daysOfWeek,
        payload.hour,
        payload.minute
      )
    )

    return response.ok({ message: 'Mission schedule updated successfully' })
  }
}
