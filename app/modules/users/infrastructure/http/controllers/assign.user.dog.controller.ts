import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { AssignUserToRobotDogUseCase } from '#app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case'
import { assignUserDogValidator } from '#users/infrastructure/http/validators/assign.user.dog.validator'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class AssignUserDogController {
  constructor(private readonly useCase: AssignUserToRobotDogUseCase) {}

  async handle({
    request,
    response,
    bouncer,
    authenticatedUser,
    logger,
  }: HttpContext): Promise<void> {
    const { robotDogId, userId } = await request.validateUsing(assignUserDogValidator)

    await bouncer.with(RobotDogPolicy).authorize('assign', robotDogId)

    logger.info(
      { callerId: authenticatedUser.id, robotDogId, userId },
      'AssignUserDogController called'
    )
    await this.useCase.execute(robotDogId, userId)
    logger.info(
      { callerId: authenticatedUser.id, robotDogId, userId },
      'AssignUserDogController completed successfully'
    )

    response.ok({ message: 'User assigned to RobotDog successfully' })
  }
}
