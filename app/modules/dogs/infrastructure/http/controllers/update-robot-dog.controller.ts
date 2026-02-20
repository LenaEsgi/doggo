import { inject } from '@adonisjs/core'
import { UpdateRobotDogUseCase } from '../../../application/contracts/update-robot-dog.use-case.js'
import { HttpContext } from '@adonisjs/core/http'
import { UpdateRobotDogValidator } from '../validators/update-robot-dog.validator.js'
import { UpdateRobotDogDto } from '../../../application/DTO/update-robot-dog.dto.js'
import { RobotDogNotFoundError } from '../../../domain/exceptions/robot-dog-not-found.error.js'

@inject()
export default class UpdateRobotDogController {
  constructor(private updateRobotDog: UpdateRobotDogUseCase) {}

  public async handle({ request, params, response, logger }: HttpContext) {
    const payload = await request.validateUsing(UpdateRobotDogValidator)

    const dto: UpdateRobotDogDto = {
      id: params.id,
      name: payload.name,
    }

    logger.info({ robotDogId: dto.id, newName: dto.name }, 'UpdateRobotDogController called')

    try {
      await this.updateRobotDog.execute(dto)

      logger.info({ robotDogId: dto.id, updatedName: dto.name }, 'UpdateRobotDogController completed successfully')

      return response.noContent()
    } catch (err) {
      if (err instanceof RobotDogNotFoundError) {
        logger.warn({ robotDogId: dto.id }, 'Attempted to update non-existent RobotDog')

        return response.notFound({ message: err.message })
      }

      logger.error({ robotDogId: dto.id, error: err }, 'Unexpected error in UpdateRobotDogController')

      return response.internalServerError({ message: 'Something went wrong' })
    }
  }
}
