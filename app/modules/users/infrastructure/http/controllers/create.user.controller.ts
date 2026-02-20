import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { CreateUserService } from '#users/application/contracts/create.user.service'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { createUserValidator } from '#users/infrastructure/http/validators/create.user.validator'

@inject()
export default class CreateUserController {
  constructor(private readonly userService: CreateUserService) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const createUserDto = await request.validateUsing(createUserValidator)
    const user = await this.userService.create(createUserDto)

    response.created({
      message: 'Created user',
      user: UserSerializer.toJson(user),
    })
  }
}
