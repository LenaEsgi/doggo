import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { IndexRobotDogsUseCase } from '#dogs/application/usecases/index-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'

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

    response.ok({
      data: RobotDogSerializer.collection(robots.data),
      meta: robots.meta,
    })
  }
}
