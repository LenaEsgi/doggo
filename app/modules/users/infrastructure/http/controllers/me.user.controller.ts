import type { HttpContext } from '@adonisjs/core/http'
import { UserRole } from '#users/domain/enums/user.role'

export default class MeUserController {
  async handle({ response, logger, authenticatedUser }: HttpContext): Promise<void> {
    logger.info({ userId: authenticatedUser.id }, 'MeUserController called')

    logger.info({ userId: authenticatedUser.id }, 'MeUserController completed successfully')
    response.ok({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      firstname: authenticatedUser.firstname,
      lastname: authenticatedUser.lastname,
      role: authenticatedUser.role === UserRole.ADMIN ? 'admin' : 'user',
    })
  }
}
