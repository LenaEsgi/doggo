import type { HttpContext } from '@adonisjs/core/http'
import { MissingBearerTokenError } from '#auth/domain/exceptions/missing-bearer-token.error'

export function extractBearerToken(request: HttpContext['request']): string {
  const authHeader = request.header('authorization')
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)

  if (!bearerMatch) {
    throw new MissingBearerTokenError()
  }

  return bearerMatch[1].trim()
}
