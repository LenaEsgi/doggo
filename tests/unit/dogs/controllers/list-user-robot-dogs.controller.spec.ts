import { test } from '@japa/runner'
import { RobotDog } from '#dogs/domain/robot-dog.entity'
import ListUserRobotDogsController from '#dogs/infrastructure/http/controllers/list-user-robot-dogs.controller'

class FakeListUserRobotDogsUseCase {
  async execute() {
    const dog = RobotDog.create('SN-001', 'Rex', 80)

    return [
      {
        robotDog: dog,
        usersCount: 2,
      },
    ]
  }
}

test('ListUserRobotDogsController returns dogs list', async ({ assert }) => {
  const controller = new ListUserRobotDogsController(new FakeListUserRobotDogsUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.lengthOf(out.body.dogs, 1)
  assert.equal(out.body.dogs[0].users.count, 2)
})
