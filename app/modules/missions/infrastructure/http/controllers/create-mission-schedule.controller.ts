import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { CreateMissionScheduleValidator } from '#app/modules/missions/infrastructure/http/validators/create-mission-schedule.validator'
import { CreateMissionScheduleUseCase } from '#app/modules/missions/application/usecases/create-mission-schedule.use-case'
import { CreateMissionScheduleDto } from '#app/modules/missions/application/dto/create-mission-schedule.dto'

@inject()
export default class CreateMissionScheduleController {
  constructor(private createUseCase: CreateMissionScheduleUseCase) {}

  public async handle({ request, response, params, bouncer }: HttpContext) {
    await bouncer.with('MissionPolicy').authorize('createSchedule', params.id)

    const payload = await request.validateUsing(CreateMissionScheduleValidator)
    const result = await this.createUseCase.execute(
      new CreateMissionScheduleDto(
        params.id,
        payload.robotDogId,
        payload.daysOfWeek,
        payload.hour,
        payload.minute
      )
    )

    return response.status(201).json({ id: result.id })
  }
}
