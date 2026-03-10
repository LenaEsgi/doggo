import { test } from '@japa/runner'
import DeleteUserController from '#users/infrastructure/http/controllers/delete.user.controller'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

class FakeDeleteUserUseCase {
  constructor(private readonly shouldThrow = false) {}

  async execute() {
    if (this.shouldThrow) {
      throw new InvalidUserNotFoundError('7b27cc5b-e591-48f2-85ba-f29f96eb9971')
    }
  }
}

test('DeleteUserController returns 200 when deleted', async ({ assert }) => {
  const controller = new DeleteUserController(new FakeDeleteUserUseCase(true) as any)

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
    },
  } as any)

  assert.equal(result.status, 200)
  assert.equal(result.body.message, 'User deleted successfully')
})

test('DeleteUserController returns 404 when missing', async ({ assert }) => {
  const controller = new DeleteUserController(new FakeDeleteUserUseCase(true) as any)

  await assert.rejects(
    () =>
      controller.handle({
        request: {
          params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
          validateUsing: async () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
        },
        response: {
          ok: () => {},
        },
      } as any),
    InvalidUserNotFoundError
  )
})
