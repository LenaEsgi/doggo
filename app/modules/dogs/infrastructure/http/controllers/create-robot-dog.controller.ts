import { inject } from '@adonisjs/core'
import { CreateRobotDogUseCase } from '../../../application/usecases/create-robot-dog.use-case.implementation.js'
import { HttpContext } from '@adonisjs/core/http'

inject()
export default class CreateRobotDogController {
  constructor(private createUseCase: CreateRobotDogUseCase) {}

  public async handle({ request, response }: HttpContext) {
    const dto = request.only(['serialNumber', 'name', 'batteryLevel'])

    await this.createUseCase.execute(dto)

    return response.status(201).json({ message: 'RobotDog created' })
  }
}
