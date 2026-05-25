import type { HttpContext } from '@adonisjs/core/http'
import { UserRole } from '#users/domain/enums/user.role'

export default class MeUserController {
  async handle(ctx: HttpContext): Promise<void> {
    const { response, logger } = ctx
    const user = ctx.authenticatedUser

    if (!user) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    logger.info({ userId: user.id }, 'MeUserController called')
    response.ok({
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role === UserRole.ADMIN ? 'admin' : 'user',
    })
  }
}
