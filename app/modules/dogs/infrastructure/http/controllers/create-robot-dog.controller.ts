import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { CreateRobotDogValidator } from '../validators/create-robot-dog.validator.js'
import { CreateRobotDogUseCase } from '#dogs/application/usecases/create-robot-dog.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class CreateRobotDogController {
  constructor(private readonly createUseCase: CreateRobotDogUseCase) {}

  async handle({ request, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('create')
    const validatedData = await request.validateUsing(CreateRobotDogValidator)
    logger.info('Creating a new RobotDog', {
      serialNumber: validatedData.serialNumber,
      name: validatedData.name,
    })

    const robotDog = await this.createUseCase.execute(validatedData)
    logger.info('RobotDog successfully created', {
      id: robotDog.id.value,
      serialNumber: robotDog.serialNumber,
    })

    return response.status(201).json({ id: robotDog.id.value })
  }
}
