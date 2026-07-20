import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { ShowRobotDogUseCase } from '#dogs/application/usecases/show-robot-dog.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'
import { UserRole } from '#users/domain/enums/user.role'

@inject()
export default class ShowRobotDogController {
  constructor(private showRobotDog: ShowRobotDogUseCase) {}

  public async handle({ params, logger, response, bouncer, authenticatedUser }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('show', params.id)

    logger.info({ robotDogId: params.id }, 'ShowRobotDogController called')

    const robot = await this.showRobotDog.execute({ id: params.id })

    logger.info({ robotDogId: params.id }, 'ShowRobotDogController completed successfully')

    const includeKey = authenticatedUser.role === UserRole.ADMIN

    return response.ok(RobotDogSerializer.toJson(robot, { includeKey }))
  }
}
