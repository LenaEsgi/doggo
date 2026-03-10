import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-existe.error'
import { DomainError } from '#app/modules/share/exceptions/domain-error'
import { HttpError } from '#app/modules/share/exceptions/http-error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof RobotDogNotFoundError) {
      return ctx.response.status(404).json({ message: error.message })
    }

    if (error instanceof RobotDogSerialNumberAlreadyExistsError) {
      return ctx.response.status(409).json({ message: error.message })
    }

    if (error instanceof InvalidUserNotFoundError) {
      return ctx.response.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
    }

    if (error instanceof HttpError) {
      return ctx.response.status(error.status).json({
        error: error.code,
        message: error.message,
        details: error.details,
      })
    }

    if (error instanceof DomainError) {
      return ctx.response.status(400).json({ message: error.message })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
