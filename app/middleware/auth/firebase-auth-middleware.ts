import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'

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
      ;(ctx as any).firebaseUser = await this.tokenVerifier.handle(idToken)

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
