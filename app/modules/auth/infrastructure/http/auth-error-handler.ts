import type { HttpContext } from '@adonisjs/core/http'
import { FirebaseHttpError } from '#auth/infrastructure/providers/firebase-auth.base'

export function handleAuthError(response: HttpContext['response'], error: unknown) {
  if (error instanceof FirebaseHttpError) {
    return response.status(error.status).send({
      error: error.code,
      message: error.message,
      details: error.details,
    })
  }

  if (error instanceof Error) {
    return response.badRequest({
      error: 'REQUEST_FAILED',
      message: error.message,
    })
  }

  return response.badRequest({
    error: 'REQUEST_FAILED',
    message: 'Unexpected error',
  })
}
