import type { HttpContext } from '@adonisjs/core/http'
import { getAuth } from 'firebase-admin/auth'

export default class FirebaseAuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const authHeader = ctx.request.header('authorization')
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)

    if (!bearerMatch) {
      return ctx.response.unauthorized({ message: 'Token missing' })
    }

    const idToken = bearerMatch[1].trim()

    try {
      ;(ctx as any).firebaseUser = await getAuth().verifyIdToken(idToken)

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
