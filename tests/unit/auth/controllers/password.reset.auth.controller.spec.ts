import { test } from '@japa/runner'
import PasswordResetAuthController from '#auth/infrastructure/controllers/password.reset.auth.controller'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import type { PasswordResetDto } from '#auth/application/dto/password_reset.dto'

class FakePasswordResetAuthService extends PasswordResetAuthService {
  async sendPasswordReset(_payload: PasswordResetDto): Promise<void> {}
}

test('PasswordResetAuthController returns success message', async ({ assert }) => {
  const controller = new PasswordResetAuthController(new FakePasswordResetAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ email: 'john@example.com' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'Password reset email sent')
})
