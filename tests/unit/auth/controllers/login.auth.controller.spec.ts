import { test } from '@japa/runner'
import LoginAuthController from '#auth/infrastructure/controllers/login.auth.controller'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import type { LoginDto } from '#auth/application/dto/login.dto'
import type { LoginResult } from '#auth/domain/types/auth.types'

class FakeLoginAuthService extends LoginAuthService {
  async login(_payload: LoginDto): Promise<LoginResult> {
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
  const controller = new LoginAuthController(new FakeLoginAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ email: 'john@example.com', password: 'SuperPassword123' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.mfaRequired, false)
})
