import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import ListRobotDogOwnersController from '#users/infrastructure/http/controllers/list.robot.dog.owners.controller'

class FakeListRobotDogOwnersUseCase {
  async execute() {
    return [
      {
        user: User.rehydrate('u1', 'firebase-u1', 'john@example.com', 'John', 'Doe', UserRole.USER),
        dogsCount: 3,
      },
    ]
  }
}

test('ListRobotDogOwnersController returns owners list', async ({ assert }) => {
  const controller = new ListRobotDogOwnersController(new FakeListRobotDogOwnersUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      params: () => ({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      validateUsing: async () => ({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.lengthOf(out.body.users, 1)
  assert.equal(out.body.users[0].dogs.count, 3)
})
