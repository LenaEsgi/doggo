import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { IndexUserService } from '#users/application/contracts/index.user.service'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'

@inject()
export default class IndexUserController {
  constructor(private readonly userService: IndexUserService) {}

  async handle({ response }: HttpContext): Promise<void> {
    const users = await this.userService.index()

    response.ok({
      users: UserSerializer.collection(users),
    })
  }
}
