import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { IndexRobotDogsUseCase } from '#dogs/application/usecases/index-robot-dogs.use-case'
import RobotDogTransformer from '#dogs/infrastructure/http/transformers/robot-dog.transformer'

@inject()
export default class ListRobotDogsController {
  constructor(private listRobotDogs: IndexRobotDogsUseCase) {}

  public async handle({ response, request, logger, serialize }: HttpContext) {
    logger.info({}, 'ListRobotDogsController called')

    const params: PaginationDto = {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
    }

    const robots = await this.listRobotDogs.execute(params)

    const { data } = await serialize(RobotDogTransformer.transform(robots.data))

    response.ok({
      data,
      meta: robots.meta,
    })
  }
}
