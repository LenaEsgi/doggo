import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CreateRobotDogUseCase } from '../../../application/contracts/create-robot-dog.use-case.js'
import {CreateRobotDogValidator} from "../validators/create-robot-dog.validator.js";

@inject()
export default class CreateRobotDogController {
  constructor(private readonly createUseCase: CreateRobotDogUseCase) {}

  async handle({ request, response }: HttpContext) {
    const validatedData = await request.validateUsing(CreateRobotDogValidator)

    await this.createUseCase.execute(validatedData)

    return response.status(201).json({ message: 'RobotDog created' })
  }
}
