import { inject } from '@adonisjs/core'
import { DestroyRobotDogUseCase } from '../../../application/contracts/destroy-robot-dog.use-case.js'
import { RobotDogNotFoundError } from '../../../domain/exceptions/robot-dog-not-found.error.js'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DeleteRobotDogController {
  constructor(private deleteRobotDog: DestroyRobotDogUseCase) {}

  public async handle({ params, response }: HttpContext) {
    try {
      await this.deleteRobotDog.execute({
        id: params.id,
      })

      return response.status(204)
    } catch (error) {
      if (error instanceof RobotDogNotFoundError) {
        return response.status(404).json({
          message: error.message,
        })
      }

      throw error
    }
  }
}
