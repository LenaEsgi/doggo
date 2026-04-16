import { test } from '@japa/runner'
import { User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import ListRobotDogOwnersController from '#users/infrastructure/http/controllers/list.robot.dog.owners.controller'

class FakeListRobotDogOwnersUseCase {
  public lastArgs?: { id: string; page: number; limit: number }

  async execute(id: string, pagination: { page: number; limit: number }) {
    this.lastArgs = { id, ...pagination }

    return {
      data: [
        {
          user: User.rehydrate(
            'u1',
            'firebase-u1',
            'john@example.com',
            'John',
            'Doe',
            UserRole.USER,
            false
          ),
          dogsCount: 3,
        },
      ],
      meta: {
        total: 1,
        perPage: pagination.limit,
        currentPage: pagination.page,
        firstPage: 1,
        lastPage: 1,
      },
    }
  }
}

test('ListRobotDogOwnersController returns owners list', async ({ assert }) => {
  const useCase = new FakeListRobotDogOwnersUseCase()
  const controller = new ListRobotDogOwnersController(useCase as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      params: () => ({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      validateUsing: async () => ({ id: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }),
      input: (key: string, defaultValue: number) => {
        if (key === 'page') return 2
        if (key === 'limit') return 5
        return defaultValue
      },
    },
    response: {
      ok: (body: any) => {
        out.status = 200
        out.body = body
        return body
      },
    },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(useCase.lastArgs?.id, '56a39d4d-b05d-42fb-a402-6782fc66dc3d')
  assert.equal(useCase.lastArgs?.page, 2)
  assert.equal(useCase.lastArgs?.limit, 5)
  assert.lengthOf(out.body.data, 1)
  assert.equal(out.body.data[0].dogs.count, 3)
  assert.equal(out.body.meta.currentPage, 2)
  assert.equal(out.body.meta.perPage, 5)
})
