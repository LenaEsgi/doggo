import type { HttpContext } from '@adonisjs/core/http'
import { UserRole } from '#users/domain/enums/user.role'

/**
 * Breaking change vs. v1 (me.user.controller.ts) : les champs `firstname`/
 * `lastname` deviennent `firstName`/`lastName`. v1 reste inchangée pour les
 * clients existants ; seuls les clients v2 reçoivent le nouveau contrat.
 */
export default class MeUserV2Controller {
  async handle(ctx: HttpContext): Promise<void> {
    const { response, logger } = ctx
    const user = ctx.authenticatedUser

    if (!user) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    logger.info({ userId: user.id }, 'MeUserV2Controller called')
    response.ok({
      id: user.id,
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      role: user.role === UserRole.ADMIN ? 'admin' : 'user',
    })
  }
}
