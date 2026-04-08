import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { AuthenticatedFirebaseUser } from '#middleware/auth/types/authenticated-firebase-user'

@inject()
export default class FirebaseAuthMiddleware {
  constructor(private readonly tokenVerifier: FirebaseTokenVerifier) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const authHeader = ctx.request.header('authorization')
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)

    if (!bearerMatch) {
      return ctx.response.unauthorized({ message: 'Token missing' })
    }

    const idToken = bearerMatch[1].trim()

    try {
      const decodedToken = await this.tokenVerifier.handle(idToken)

      if (!decodedToken.email_verified) {
        return ctx.response.forbidden({ message: 'Email not verified' })
      }

      ;(ctx as any).firebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email ?? null,
      } satisfies AuthenticatedFirebaseUser

      await next()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid or expired token'
      return ctx.response.unauthorized({
        message: 'Invalid or expired token',
        reason: message,
      })
    }
  }
}
