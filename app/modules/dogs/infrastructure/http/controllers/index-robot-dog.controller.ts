import { inject } from '@adonisjs/core'
import { IndexRobotDogsUseCase } from '../../../application/contracts/index-robot-dogs.use-case.js'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ListRobotDogsController {
  constructor(private listRobotDogs: IndexRobotDogsUseCase) {}

  public async handle({ response, logger }: HttpContext) {
    logger.info({}, 'ListRobotDogsController called')

    const robots = await this.listRobotDogs.execute()

    logger.info({ count: robots.length }, 'ListRobotDogsController completed successfully')

    return response.status(200).json(
      robots.map((dog) => ({
        id: dog.id,
        serialNumber: dog.serialNumber,
        name: dog.name,
        state: dog.state,
        batteryLevel: dog.batteryLevel,
        lastHeartbeat: dog.lastHeartbeat,
      }))
    )
  }
}
