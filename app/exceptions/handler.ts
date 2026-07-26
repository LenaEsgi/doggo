import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { DomainError } from '#app/modules/share/exceptions/domain-error'
import { HttpError } from '#app/modules/share/exceptions/http-error'

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
    if (error instanceof HttpError) {
      return ctx.response.status(error.status).json({
        error: error.code,
        message: error.message,
        details: error.details,
      })
    }

    if (error instanceof DomainError) {
      return ctx.response.status(error.httpStatus).json({
        error: error.code,
        message: error.message,
        details: error.details,
      })
    }

    if (!this.debug && this.isUnclassifiedServerError(error)) {
      return this.renderSanitizedError(error, ctx)
    }

    return super.handle(error, ctx)
  }

  /**
   * Errors already self-rendering (Vine validation, Bouncer authorization,
   * framework exceptions with their own `.handle()`) already produce a safe,
   * user-facing message - let them go through untouched.
   */
  private isSelfHandled(error: unknown): boolean {
    const candidate = error as { handle?: unknown; code?: unknown }
    return typeof candidate?.handle === 'function' || candidate?.code === 'E_VALIDATION_ERROR'
  }

  /**
   * True only for errors that are neither self-handled nor carry a known
   * client-facing (< 500) status - i.e. a raw DB/third-party/unexpected error
   * whose `.message` was never meant to be shown to a client. Framework
   * exceptions like a 404 route-not-found already have a safe, intentional
   * message and are left alone even without a `.handle()` method.
   */
  private isUnclassifiedServerError(error: unknown): boolean {
    if (this.isSelfHandled(error)) return false
    const status = (error as { status?: unknown })?.status
    const numericStatus = typeof status === 'number' ? status : 500
    return numericStatus >= 500
  }

  /**
   * Any other error reaching here is unclassified (DB error, third-party SDK,
   * unexpected bug) - its `.message` may contain internal details (schema,
   * connection info, stack-derived text) and must never reach the client in
   * production. The original error is still logged in full via report().
   */
  private renderSanitizedError(error: unknown, ctx: HttpContext) {
    const status = typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : 500

    return ctx.response.status(status).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    })
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
