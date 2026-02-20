import { inject } from '@adonisjs/core'
import { ShowRobotDogUseCase } from '../../../application/contracts/show-robot-dog.use-case.js'
import { RobotDogNotFoundError } from '../../../domain/exceptions/robot-dog-not-found.error.js'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ShowRobotDogController {
  constructor(private showRobotDog: ShowRobotDogUseCase) {}

  public async handle({ params, response, logger }: HttpContext) {
    logger.info({ robotDogId: params.id }, 'ShowRobotDogController called')

    try {
      const robot = await this.showRobotDog.execute({ id: params.id })

      logger.info({ robotDogId: params.id }, 'ShowRobotDogController completed successfully')

      return response.status(200).json({
        id: robot.id,
        serialNumber: robot.serialNumber,
        name: robot.name,
        state: robot.state,
        batteryLevel: robot.batteryLevel,
        lastHeartbeat: robot.lastHeartbeat,
      })
    } catch (err) {
      if (err instanceof RobotDogNotFoundError) {
        logger.warn({ robotDogId: params.id }, 'RobotDog not found')

        return response.status(404).json({ message: err.message })
      }

      logger.error({ robotDogId: params.id, error: err }, 'Unexpected error in ShowRobotDogController')

      throw err
    }
  }
}
