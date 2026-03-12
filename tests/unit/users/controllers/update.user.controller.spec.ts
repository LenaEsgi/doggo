import { test } from '@japa/runner'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'
import UpdateUserController from '#users/infrastructure/http/controllers/update.user.controller'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

class FakeUpdateUserUseCase {
  constructor(private readonly result: { user: User; dogsCount: number } | null) {}

  async execute() {
    if (!this.result) {
      throw new InvalidUserNotFoundError('7b27cc5b-e591-48f2-85ba-f29f96eb9971')
    }

    return this.result
  }
}

test('UpdateUserController returns 200 when updated', async ({ assert }) => {
  const controller = new UpdateUserController(
    new FakeUpdateUserUseCase({
      user: User.rehydrate(
        'u1',
        'firebase-uid-jane',
        'jane@example.com',
        'Jane',
        'Doe',
        UserRole.ADMIN
      ),
      dogsCount: 4,
    }) as any
  )

  const result: { status?: number; body?: any } = {}
  let call = 0

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => {
        call += 1
        return call === 1
          ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }
          : { firstname: 'Jane', role: 'admin' }
      },
    },
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
    },
    logger: { info: () => {} },
  } as any)

  assert.equal(result.status, 200)
  assert.equal(result.body.message, 'User updated successfully')
  assert.equal(result.body.user.role, 'admin')
  assert.equal(result.body.user.dogs.count, 4)
})

test('UpdateUserController returns 404 when missing', async ({ assert }) => {
  const controller = new UpdateUserController(new FakeUpdateUserUseCase(null) as any)
  let call = 0

  await assert.rejects(
    () =>
      controller.handle({
        request: {
          params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
          validateUsing: async () => {
            call += 1
            return call === 1
              ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }
              : { firstname: 'Jane' }
          },
        },
        response: {
          ok: () => {},
        },
        logger: { info: () => {} },
      } as any),
    InvalidUserNotFoundError
  )
})
