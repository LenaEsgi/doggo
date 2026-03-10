import { test } from '@japa/runner'
import type { LoginWithTotpDto } from '#auth/application/dto/login-with-totp.dto'
import type { AuthTokens } from '#auth/domain/types/auth.tokens'
import LoginWithTotpAuthController from '#auth/infrastructure/http/controllers/login.with.totp.auth.controller'

class FakeLoginWithTotpAuthUseCase {
  async execute(_payload: LoginWithTotpDto): Promise<AuthTokens> {
    return {
      localId: 'uid-1',
      email: 'john@example.com',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    }
  }
}

test('LoginWithTotpAuthController returns auth success payload', async ({ assert }) => {
  const controller = new LoginWithTotpAuthController(new FakeLoginWithTotpAuthUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      validateUsing: async () => ({
        pendingCredential: 'pending',
        mfaEnrollmentId: 'mfa-id',
        verificationCode: '123456',
      }),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.user.uid, 'uid-1')
})
