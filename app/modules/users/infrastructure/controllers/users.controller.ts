import type { HttpContext } from '@adonisjs/core/http'
import UserModel from '#users/infrastructure/database/models/user'
import {
  updateUserValidator,
  userIdParamValidator,
} from '#users/infrastructure/validators/users.validators'

export default class UsersController {
  async index({ response }: HttpContext) {
    const users = await UserModel.query().orderBy('created_at', 'desc')

    return response.ok({
      users,
    })
  }

  async show({ request, response }: HttpContext) {
    const { id } = await request.validateUsing(userIdParamValidator, {
      data: request.params(),
    })

    const user = await UserModel.find(id)
    if (!user) {
      return response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
    }

    return response.ok({
      user,
    })
  }

  async update({ request, response }: HttpContext) {
    const { id } = await request.validateUsing(userIdParamValidator, {
      data: request.params(),
    })
    const payload = await request.validateUsing(updateUserValidator)

    const user = await UserModel.find(id)
    if (!user) {
      return response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
    }

    const { role, ...rest } = payload
    user.merge(rest)
    if (role) {
      user.role = role as unknown as UserModel['role']
    }
    await user.save()

    return response.ok({
      message: 'User updated successfully',
      user,
    })
  }

  async destroy({ request, response }: HttpContext) {
    const { id } = await request.validateUsing(userIdParamValidator, {
      data: request.params(),
    })

    const user = await UserModel.find(id)
    if (!user) {
      return response.notFound({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      })
    }

    await user.delete()

    return response.ok({
      message: 'User deleted successfully',
    })
  }
}
