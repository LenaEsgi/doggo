import { test } from '@japa/runner'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'
import ShowUserController from '#users/infrastructure/http/controllers/show.user.controller'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import {
  fakeBouncer,
  fakeAuthenticatedUser,
  fakeSerialize,
} from '#tests/unit/helpers/controller-mocks'

class FakeShowUserUseCase {
  constructor(private readonly user: { user: User; dogsCount: number } | null) {}

  async execute() {
    if (!this.user) {
      throw new InvalidUserNotFoundError('7b27cc5b-e591-48f2-85ba-f29f96eb9971')
    }

    return this.user
  }
}

test('ShowUserController returns 200 when found', async ({ assert }) => {
  const controller = new ShowUserController(
    new FakeShowUserUseCase({
      user: User.rehydrate(
        'u1',
        'firebase-uid-john',
        'john@example.com',
        'John',
        'Doe',
        UserRole.USER
      ),
      dogsCount: 1,
    }) as any
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
    },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
    authenticatedUser: fakeAuthenticatedUser(UserRole.ADMIN),
    serialize: fakeSerialize,
  } as any)

  assert.equal(result.status, 200)
  assert.equal(result.body.user.email, 'john@example.com')
  assert.equal(result.body.user.dogs.count, 1)
})

test('ShowUserController returns 404 when missing', async ({ assert }) => {
  const controller = new ShowUserController(new FakeShowUserUseCase(null) as any)

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
        logger: { info: () => {} },
        bouncer: fakeBouncer(),
        authenticatedUser: fakeAuthenticatedUser(UserRole.ADMIN),
        serialize: fakeSerialize,
      } as any),
    InvalidUserNotFoundError
  )
})
