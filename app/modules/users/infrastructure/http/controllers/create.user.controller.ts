import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { CreateUserUseCase } from '#users/application/usecases/create-user.use-case'
import { UserSerializer } from '#users/infrastructure/serializers/user.serializer'
import { createUserValidator } from '#users/infrastructure/http/validators/create.user.validator'

@inject()
export default class CreateUserController {
  constructor(private readonly useCase: CreateUserUseCase) {}

  async handle({ request, response }: HttpContext): Promise<void> {
    const createUserDto = await request.validateUsing(createUserValidator)
    const user = await this.useCase.execute(createUserDto)

    response.created({
      message: 'Created user',
      user: UserSerializer.toJson(user),
    })
  }
}
