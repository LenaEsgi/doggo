import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { UpdateRobotDogValidator } from '#app/modules/dogs/infrastructure/http/validators/update-robot-dog.validator'
import { UpdateRobotDogDto } from '#app/modules/dogs/application/DTO/update-robot-dog.dto'
import { UpdateRobotDogUseCase } from '#dogs/application/usecases/update-robot-dog.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class UpdateRobotDogController {
  constructor(private updateRobotDog: UpdateRobotDogUseCase) {}

  public async handle({ request, params, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('update', params.id)

    const payload = await request.validateUsing(UpdateRobotDogValidator)

    const dto: UpdateRobotDogDto = {
      id: params.id,
      name: payload.name,
    }

    logger.info({ robotDogId: dto.id, newName: dto.name }, 'UpdateRobotDogController called')

    await this.updateRobotDog.execute(dto)

    logger.info(
      { robotDogId: dto.id, updatedName: dto.name },
      'UpdateRobotDogController completed successfully'
    )

    return response.noContent()
  }
}
