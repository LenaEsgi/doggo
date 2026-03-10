import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { IndexUserUseCase } from '#users/application/usecases/index-user.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'

@inject()
export default class IndexUserController {
  constructor(private readonly useCase: IndexUserUseCase) {}

  async handle({ response }: HttpContext): Promise<void> {
    const users = await this.useCase.execute()

    response.ok({
      users: UserSerializer.collection(users),
    })
  }
}
