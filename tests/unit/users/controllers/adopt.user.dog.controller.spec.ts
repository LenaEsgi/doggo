import { test } from '@japa/runner'
import AdoptUserDogController from '#users/infrastructure/http/controllers/adopt.user.dog.controller'
import { fakeBouncer } from '#tests/unit/helpers/controller-mocks'

class FakeAdoptDogUseCase {
  public lastCall?: { userId: string; serialNumber: string; key: string }

  async execute(userId: string, serialNumber: string, key: string): Promise<void> {
    this.lastCall = { userId, serialNumber, key }
  }
}

test('AdoptUserDogController returns success payload and forwards the key', async ({ assert }) => {
  const useCase = new FakeAdoptDogUseCase()
  const controller = new AdoptUserDogController(useCase as any)
  const out: { status?: number; body?: any } = {}
  let call = 0

  await controller.handle({
    request: {
      params: () => ({ id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }),
      validateUsing: async () => {
        call += 1
        return call === 1
          ? { id: '7b27cc5b-e591-48f2-85ba-f29f96eb9971' }
          : { serialNumber: 'SN-123', key: '123456789012345678' }
      },
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
    bouncer: fakeBouncer(),
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'RobotDog adopted successfully')
  assert.deepEqual(useCase.lastCall, {
    userId: '7b27cc5b-e591-48f2-85ba-f29f96eb9971',
    serialNumber: 'SN-123',
    key: '123456789012345678',
  })
})
