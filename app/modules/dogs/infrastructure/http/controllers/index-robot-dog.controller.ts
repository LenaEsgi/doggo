import { inject } from '@adonisjs/core'
import { IndexRobotDogsUseCase } from '../../../application/contracts/index-robot-dogs.use-case.js'
import { HttpContext } from '@adonisjs/core/http'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export default class ListRobotDogsController {
  constructor(private listRobotDogs: IndexRobotDogsUseCase) {}

  public async handle({ response, request, logger }: HttpContext) {
    logger.info({}, 'ListRobotDogsController called')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    const robots = await this.listRobotDogs.execute(params)

    return response.status(200).json(robots)
  }
}
