import { inject } from '@adonisjs/core'
import { ShowRobotDogUseCase } from '../../../application/contracts/show-robot-dog.use-case.js'
import { RobotDogNotFoundError } from '../../../domain/exceptions/robot-dog-not-found.error.js'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ShowRobotDogController {
  constructor(private showRobotDog: ShowRobotDogUseCase) {}

  public async handle({ params, response }: HttpContext) {
    try {
      const robot = await this.showRobotDog.execute({ id: params.id })

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
        return response.status(404).json({ message: err.message })
      }

      throw err
    }
  }
}
