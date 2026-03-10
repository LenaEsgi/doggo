import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import IndexUserController from '#users/infrastructure/http/controllers/index.user.controller'

class FakeIndexUserUseCase {
  async execute() {
    return [
      User.rehydrate('u1', 'firebase-uid-john', 'john@example.com', 'John', 'Doe', UserRole.USER),
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
  } as any)

  assert.equal(result.status, 200)
  assert.lengthOf(result.body.users, 1)
  assert.equal(result.body.users[0].email, 'john@example.com')
})
