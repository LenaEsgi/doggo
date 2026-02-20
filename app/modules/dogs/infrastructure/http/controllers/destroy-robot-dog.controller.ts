import { inject } from '@adonisjs/core'
import { DestroyRobotDogUseCase } from '../../../application/contracts/destroy-robot-dog.use-case.js'
import { RobotDogNotFoundError } from '../../../domain/exceptions/robot-dog-not-found.error.js'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DeleteRobotDogController {
  constructor(private deleteRobotDog: DestroyRobotDogUseCase) {}

  public async handle({ params, response, logger }: HttpContext) {
    logger.info({ robotDogId: params.id }, 'DeleteRobotDogController called')

    try {
      await this.deleteRobotDog.execute({ id: params.id })

      logger.info({ robotDogId: params.id }, 'RobotDog successfully deleted')

      return response.status(204)
    } catch (error) {
      if (error instanceof RobotDogNotFoundError) {
        logger.warn({ robotDogId: params.id }, 'Attempted to delete non-existent RobotDog')

        return response.status(404).json({
          message: error.message,
        })
      }

      logger.error({ robotDogId: params.id, error }, 'Unexpected error while deleting RobotDog')

      throw error
    }
  }
}
