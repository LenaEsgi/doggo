import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { sendRobotCommandValidator } from '../validators/send-robot-command.validator.js'
import { RobotCommandDispatcher } from '#app/modules/robot-communication/application/use-cases/robot-command-dispatcher.use-case'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class SendRobotCommandController {
  constructor(private robotCommandDispatcher: RobotCommandDispatcher) {}

  public async handle({ request, params, response, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('sendCommand', params.id)

    const payload = await request.validateUsing(sendRobotCommandValidator)

    logger.info({ dogId: params.id, command: payload.type }, 'SendRobotCommandController called')

    await this.robotCommandDispatcher.execute(params.id, {
      type: payload.type,
      missionId: payload.missionId,
    })

    logger.info({ dogId: params.id, command: payload.type }, 'SendRobotCommandController completed')

    return response.noContent()
  }
}
