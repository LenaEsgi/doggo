import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AbandonRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/abandon-robot-dog.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'
import { revokeUserDogValidator } from '#users/infrastructure/http/validators/revoke.user.dog.validator'

@inject()
export default class RevokeUserDogController {
  constructor(private readonly useCase: AbandonRobotDogUseCase) {}

  async handle({ request, response, bouncer, logger }: HttpContext): Promise<void> {
    const { robotDogId, userId } = await request.validateUsing(revokeUserDogValidator)

    await bouncer.with(RobotDogPolicy).authorize('revoke', robotDogId)

    logger.info({ robotDogId, userId }, 'RevokeUserDogController called')
    await this.useCase.execute(userId, robotDogId)
    logger.info({ robotDogId, userId }, 'RevokeUserDogController completed successfully')

    response.ok({ message: 'User revoked from RobotDog successfully' })
  }
}
