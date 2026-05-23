import { test } from '@japa/runner'
import AssignUserDogController from '#users/infrastructure/http/controllers/assign.user.dog.controller'

class FakeAssignUserDogUseCase {
  public calledWith: { robotDogId: string; userId: string } | null = null
  async execute(robotDogId: string, userId: string): Promise<void> {
    this.calledWith = { robotDogId, userId }
  }
}

const ROBOT_DOG_ID = '56a39d4d-b05d-42fb-a402-6782fc66dc3d'
const USER_ID = '7b27cc5b-e591-48f2-85ba-f29f96eb9971'
const CALLER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

test.group('AssignUserDogController', () => {
  test('returns 200 and delegates to use case', async ({ assert }) => {
    const fakeUseCase = new FakeAssignUserDogUseCase()
    const controller = new AssignUserDogController(fakeUseCase as any)
    const out: { status?: number; body?: any } = {}

    await controller.handle({
      request: {
        validateUsing: async () => ({ robotDogId: ROBOT_DOG_ID, userId: USER_ID }),
      },
      response: { ok: (body: any) => ((out.status = 200), (out.body = body)) },
      bouncer: { with: () => ({ authorize: async () => {} }) },
      authenticatedUser: { id: CALLER_ID },
      logger: { info: () => {} },
    } as any)

    assert.equal(out.status, 200)
    assert.equal(out.body.message, 'User assigned to RobotDog successfully')
    assert.deepEqual(fakeUseCase.calledWith, { robotDogId: ROBOT_DOG_ID, userId: USER_ID })
  })
})
