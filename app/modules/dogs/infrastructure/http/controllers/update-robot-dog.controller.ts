import { inject } from '@adonisjs/core'
import { UpdateRobotDogUseCase } from '../../../application/contracts/update-robot-dog.use-case.js'
import { HttpContext } from '@adonisjs/core/http'
import { UpdateRobotDogValidator } from '../validators/update-robot-dog-validator.js'
import { UpdateRobotDogDto } from '../../../application/DTO/update-robot-dog.dto.js'

@inject()
export default class UpdateRobotDogController {
  constructor(
     private updateRobotDog: UpdateRobotDogUseCase
  ) {}

  public async handle({ request, params, response }: HttpContext) {
    const payload = await request.validateUsing(UpdateRobotDogValidator)

    const dto: UpdateRobotDogDto = {
      id: params.id,
      name: payload.name,
    }
    await this.updateRobotDog.execute(dto)
    return response.noContent()

    }
}
