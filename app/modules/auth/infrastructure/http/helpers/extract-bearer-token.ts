import type { HttpContext } from '@adonisjs/core/http'

export function extractBearerToken(request: HttpContext['request']): string {
  const authHeader = request.header('authorization')
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)

  if (!bearerMatch) {
    throw new Error('Authorization bearer token is missing')
  }

  return bearerMatch[1].trim()
}
