import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CreateRobotDogUseCase } from '../../../application/contracts/create-robot-dog.use-case.js'
import { CreateRobotDogValidator } from '../validators/create-robot-dog.validator.js'

@inject()
export default class CreateRobotDogController {
  constructor(private readonly createUseCase: CreateRobotDogUseCase) {}

  async handle({ request, response, logger }: HttpContext) {
    const validatedData = await request.validateUsing(CreateRobotDogValidator)
    logger.info('Creating a new RobotDog', {
      serialNumber: validatedData.serialNumber,
      name: validatedData.name,
    })

    await this.createUseCase.execute(validatedData)
    logger.info('RobotDog successfully created', {
      serialNumber: validatedData.serialNumber,
      name: validatedData.name,
    })

    return response.status(201).json({ message: 'RobotDog created' })
  }
}
