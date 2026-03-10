import { test } from '@japa/runner'
import type { PasswordResetDto } from '#auth/application/dto/password-reset.dto'
import PasswordResetAuthController from '#auth/infrastructure/http/controllers/password.reset.auth.controller'

class FakePasswordResetAuthUseCase {
  async execute(_payload: PasswordResetDto): Promise<void> {}
}

test('PasswordResetAuthController returns success message', async ({ assert }) => {
  const controller = new PasswordResetAuthController(new FakePasswordResetAuthUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ email: 'john@example.com' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'Password reset email sent')
})
