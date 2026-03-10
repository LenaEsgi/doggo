import { test } from '@japa/runner'
import type { LoginDto } from '#auth/application/dto/login.dto'
import type { LoginResult } from '#auth/domain/types/login.result'
import LoginAuthController from '#auth/infrastructure/http/controllers/login.auth.controller'

class FakeLoginAuthUseCase {
  async execute(_payload: LoginDto): Promise<LoginResult> {
    return {
      mfaRequired: false,
      localId: 'uid-1',
      email: 'john@example.com',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    }
  }
}

test('LoginAuthController returns login payload', async ({ assert }) => {
  const controller = new LoginAuthController(new FakeLoginAuthUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      validateUsing: async () => ({ email: 'john@example.com', password: 'SuperPassword123' }),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.mfaRequired, false)
})
