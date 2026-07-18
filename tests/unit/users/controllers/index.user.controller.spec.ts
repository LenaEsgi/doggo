import { test } from '@japa/runner'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'
import IndexUserController from '#users/infrastructure/http/controllers/index.user.controller'
import {
  fakeBouncer,
  fakeAuthenticatedUser,
  fakeSerialize,
} from '#tests/unit/helpers/controller-mocks'

class FakeIndexUserUseCase {
  async execute() {
    return {
      data: [
        {
          user: User.rehydrate(
            'u1',
            'firebase-uid-john',
            'john@example.com',
            'John',
            'Doe',
            UserRole.USER
          ),
          dogsCount: 2,
        },
      ],
      meta: { total: 1, perPage: 25, currentPage: 1, firstPage: 1, lastPage: 1 },
    }
  }
}

test('IndexUserController returns users list', async ({ assert }) => {
  const controller = new IndexUserController(new FakeIndexUserUseCase() as any)
  const result: { status?: number; body?: any } = {}

  await controller.handle({
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
        return body
      },
    },
    request: {
      input: (_key: string, defaultValue: any) => defaultValue,
    },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
    authenticatedUser: fakeAuthenticatedUser(UserRole.ADMIN),
    serialize: fakeSerialize,
  } as any)

  assert.equal(result.status, 200)
  assert.lengthOf(result.body.data, 1)
  assert.equal(result.body.data[0].email, 'john@example.com')
  assert.equal(result.body.data[0].dogs.count, 2)
  assert.exists(result.body.meta)
})

test('IndexUserController returns 422 for non-admin without search', async ({ assert }) => {
  const controller = new IndexUserController(new FakeIndexUserUseCase() as any)
  const result: { status?: number; body?: any } = {}

  await controller.handle({
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      unprocessableEntity: (body: any) => {
        result.status = 422
        result.body = body
      },
    },
    request: { input: (_key: string, defaultValue: any) => defaultValue },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
    authenticatedUser: fakeAuthenticatedUser(UserRole.USER),
    serialize: fakeSerialize,
  } as any)

  assert.equal(result.status, 422)
})

test('IndexUserController returns 422 for non-admin with search shorter than 3 chars', async ({
  assert,
}) => {
  const controller = new IndexUserController(new FakeIndexUserUseCase() as any)
  const result: { status?: number; body?: any } = {}

  await controller.handle({
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      unprocessableEntity: (body: any) => {
        result.status = 422
        result.body = body
      },
    },
    request: {
      input: (key: string, defaultValue: any) => (key === 'search' ? 'ab' : defaultValue),
    },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
    authenticatedUser: fakeAuthenticatedUser(UserRole.USER),
    serialize: fakeSerialize,
  } as any)

  assert.equal(result.status, 422)
})

test('IndexUserController returns users for non-admin with valid search', async ({ assert }) => {
  const controller = new IndexUserController(new FakeIndexUserUseCase() as any)
  const result: { status?: number; body?: any } = {}

  await controller.handle({
    response: {
      ok: (body: any) => {
        result.status = 200
        result.body = body
      },
      unprocessableEntity: (body: any) => {
        result.status = 422
        result.body = body
      },
    },
    request: {
      input: (key: string, defaultValue: any) => (key === 'search' ? 'ali' : defaultValue),
    },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
    authenticatedUser: fakeAuthenticatedUser(UserRole.USER),
    serialize: fakeSerialize,
  } as any)

  assert.equal(result.status, 200)
  assert.lengthOf(result.body.data, 1)
  assert.equal(result.body.data[0].role, 'user')
  assert.notExists(result.body.data[0].dogs)
})
