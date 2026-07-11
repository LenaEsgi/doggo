import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotDogSerialNumberAlreadyExistsError } from '#dogs/domain/exceptions/robot-dog-serial-number-already-exists.error'
import { InvalidRobotDogNameError } from '#dogs/domain/exceptions/invalid-robot-dog-name.error'
import { DomainError } from '#app/modules/share/exceptions/domain-error'
import { HttpError } from '#app/modules/share/exceptions/http-error'
import { ActiveOwnershipNotFoundError } from '#app/modules/users/ownerships/domain/exceptions/active-ownership-not-found.error'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/mission-not-found.error'
import { InvalidMissionNotEditableError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-editable.error'
import { InvalidMissionAlreadyRunningError } from '#app/modules/missions/domain/exceptions/invalid-mission-already-running.error'
import { InvalidMissionStepNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-step-not-found.error'
import { ActionNotFoundError } from '#app/modules/actions/domain/exceptions/action-not-found.error'
import { ActionAlreadyExistsError } from '#app/modules/actions/domain/exceptions/action-already-exists.error'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'

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

    if (error instanceof ActiveOwnershipNotFoundError) {
      return ctx.response.status(404).json({
        error: 'ACTIVE_OWNERSHIP_NOT_FOUND',
        message: error.message,
      })
    }

    if (error instanceof OwnershipAlreadyExistsError) {
      return ctx.response.status(409).json({
        error: 'OWNERSHIP_ALREADY_EXISTS',
        message: error.message,
      })
    }

    if (error instanceof MissionNotFoundError) {
      return ctx.response.status(404).json({
        error: 'MISSION_NOT_FOUND',
        message: error.message,
      })
    }

    if (error instanceof InvalidMissionNotEditableError) {
      return ctx.response.status(422).json({
        error: 'MISSION_NOT_EDITABLE',
        message: error.message,
      })
    }

    if (error instanceof InvalidMissionAlreadyRunningError) {
      return ctx.response.status(409).json({
        error: 'MISSION_ALREADY_RUNNING',
        message: error.message,
      })
    }

    if (error instanceof InvalidMissionStepNotFoundError) {
      return ctx.response.status(404).json({
        error: 'MISSION_STEP_NOT_FOUND',
        message: error.message,
      })
    }

    if (error instanceof ActionNotFoundError) {
      return ctx.response.status(404).json({
        error: 'ACTION_NOT_FOUND',
        message: error.message,
      })
    }

    if (error instanceof ActionAlreadyExistsError) {
      return ctx.response.status(409).json({
        error: 'ACTION_ALREADY_EXISTS',
        message: error.message,
      })
    }

    if (error instanceof InvalidRobotCommandError) {
      return ctx.response.status(422).json({
        error: 'INVALID_ROBOT_COMMAND',
        message: error.message,
      })
    }

    if (error instanceof InvalidRobotDogNameError) {
      return ctx.response.status(422).json({
        error: 'INVALID_ROBOT_DOG_NAME',
        message: error.message,
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
