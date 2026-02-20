import { test } from '@japa/runner'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import DeleteUserController from '#users/infrastructure/http/controllers/delete.user.controller'

class FakeDeleteUserService extends DeleteUserService {
  constructor(private readonly result: boolean) {
    super()
  }

  async delete() {
    return this.result
  }
}

test('DeleteUserController returns 200 when deleted', async ({ assert }) => {
  const controller = new DeleteUserController(new FakeDeleteUserService(true))

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
  assert.equal(result.body.message, 'User deleted successfully')
})

test('DeleteUserController returns 404 when missing', async ({ assert }) => {
  const controller = new DeleteUserController(new FakeDeleteUserService(false))

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
