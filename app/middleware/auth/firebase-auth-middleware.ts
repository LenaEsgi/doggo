import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import type { User } from '#users/domain/user.entity'
import { extractBearerToken } from '#auth/infrastructure/http/helpers/extract-bearer-token'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    authenticatedUser: User
  }
}

@inject()
export default class FirebaseAuthMiddleware {
  constructor(
    private readonly tokenVerifier: FirebaseTokenVerifier,
    private readonly userRepository: UserReadRepository
  ) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    let idToken: string
    try {
      idToken = extractBearerToken(ctx.request)
    } catch {
      ctx.logger.warn({ path: ctx.request.url() }, 'FirebaseAuthMiddleware rejected: token missing')
      return ctx.response.unauthorized({ message: 'Token missing' })
    }

    try {
      const decodedToken = await this.tokenVerifier.handle(idToken)

      if (!decodedToken.email_verified) {
        ctx.logger.warn(
          { uid: decodedToken.uid },
          'FirebaseAuthMiddleware rejected: email not verified'
        )
        return ctx.response.unauthorized({ message: 'Email not verified' })
      }

      const user = await this.userRepository.findByFirebaseUid(decodedToken.uid)

      if (!user) {
        ctx.logger.warn({ uid: decodedToken.uid }, 'FirebaseAuthMiddleware rejected: user not found')
        return ctx.response.unauthorized({ message: 'User not found' })
      }

      ctx.authenticatedUser = user

      await next()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid or expired token'
      ctx.logger.warn(
        { reason: message },
        'FirebaseAuthMiddleware rejected: invalid or expired token'
      )
      return ctx.response.unauthorized({
        message: 'Invalid or expired token',
        reason: message,
      })
    }
  }
}
