import { test } from '@japa/runner'
import { UserRole } from '#users/domain/enums/user.role'
import { User } from '#users/domain/user.entity'
import IndexUserController from '#users/infrastructure/http/controllers/index.user.controller'

class FakeIndexUserUseCase {
  async execute() {
    return [
      {
        user: User.rehydrate(
          'u1',
          'firebase-uid-john',
          'john@example.com',
          'John',
          'Doe',
          UserRole.USER,
          false
        ),
        dogsCount: 2,
      },
    ]
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
    logger: { info: () => {} },
  } as any)

  assert.equal(result.status, 200)
  assert.lengthOf(result.body.users, 1)
  assert.equal(result.body.users[0].email, 'john@example.com')
  assert.equal(result.body.users[0].dogs.count, 2)
})
