import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { parsePaginationParams } from '#app/modules/share/utils/parse-pagination-params'
import { IndexRobotDogsUseCase } from '#dogs/application/usecases/index-robot-dogs.use-case'
import { RobotDogSerializer } from '#dogs/infrastructure/http/serializers/robot-dog.serializer'
import RobotDogPolicy from '#dogs/application/policies/robot-dog.policy'

@inject()
export default class ListRobotDogsController {
  constructor(private listRobotDogs: IndexRobotDogsUseCase) {}

  public async handle({ response, request, logger, bouncer }: HttpContext) {
    await bouncer.with(RobotDogPolicy).authorize('index')

    logger.info({}, 'ListRobotDogsController called')

    const params = parsePaginationParams(request)

    const robots = await this.listRobotDogs.execute(params)

    response.ok({
      data: RobotDogSerializer.collection(robots.data),
      meta: robots.meta,
    })
  }
}
