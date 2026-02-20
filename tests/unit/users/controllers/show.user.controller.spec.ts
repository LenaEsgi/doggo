import { test } from '@japa/runner'
import ShowUserController from '#users/infrastructure/controllers/show.user.controller'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'

class FakeShowUserService extends ShowUserService {
  constructor(private readonly user: User | null) {
    super()
  }

  async show() {
    return this.user
  }
}

test('ShowUserController returns 200 when found', async ({ assert }) => {
  const controller = new ShowUserController(
    new FakeShowUserService(User.rehydrate('u1', 'john@example.com', 'John', 'Doe', UserRole.USER))
  )

  const result: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
    },
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      notFound: (body: any) => {
        result.status = 404
        result.body = body
      },
    },
  } as any)

  assert.equal(result.status, 200)
  assert.equal(result.body.user.email, 'john@example.com')
})

test('ShowUserController returns 404 when missing', async ({ assert }) => {
  const controller = new ShowUserController(new FakeShowUserService(null))
  const result: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
    },
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      notFound: (body: any) => {
        result.status = 404
        result.body = body
      },
    },
  } as any)

  assert.equal(result.status, 404)
  assert.equal(result.body.error, 'USER_NOT_FOUND')
})
