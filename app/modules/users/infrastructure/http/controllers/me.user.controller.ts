import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserRole } from '#users/domain/enums/user.role'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import type { AuthenticatedFirebaseUser } from '#middleware/auth/types/authenticated-firebase-user'

@inject()
export default class MeUserController {
  constructor(private readonly userRepository: UserReadRepository) {}

  async handle(ctx: HttpContext): Promise<void> {
    const { response, logger } = ctx
    const firebaseUser = (ctx as unknown as { firebaseUser?: AuthenticatedFirebaseUser })
      .firebaseUser

    if (!firebaseUser?.uid) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    logger.info({ firebaseUid: firebaseUser.uid }, 'MeUserController called')
    const user = await this.userRepository.findByFirebaseUid(firebaseUser.uid)

    if (!user) {
      throw new InvalidUserNotFoundError(firebaseUser.uid)
    }

    logger.info({ userId: user.id }, 'MeUserController completed successfully')
    response.ok({
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role === UserRole.ADMIN ? 'admin' : 'user',
    })
  }
}
