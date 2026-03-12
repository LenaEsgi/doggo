import { test } from '@japa/runner'
import AdoptUserDogController from '#users/infrastructure/http/controllers/adopt.user.dog.controller'

class FakeAdoptDogUseCase {
  async execute(_userId: string, _robotDogId: string): Promise<void> {}
}

test('AdoptUserDogController returns success payload', async ({ assert }) => {
  const controller = new AdoptUserDogController(new FakeAdoptDogUseCase() as any)
  const out: { status?: number; body?: any } = {}
  let call = 0

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => {
        call += 1
        return call === 1
          ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }
          : { robotDogId: '56a39d4d-b05d-42fb-a402-6782fc66dc3d' }
      },
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'RobotDog adopted successfully')
})
