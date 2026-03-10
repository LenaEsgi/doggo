import { test } from '@japa/runner'
import type { DisableMfaDto } from '#auth/application/dto/disable-mfa.dto'
import type { DisableMfaResult } from '#auth/domain/types/disable.mfa.result'
import DisableMfaAuthController from '#auth/infrastructure/http/controllers/disable.mfa.auth.controller'

class FakeDisableMfaAuthUseCase {
  async execute(_payload: DisableMfaDto): Promise<DisableMfaResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }
}

test('DisableMfaAuthController returns success payload', async ({ assert }) => {
  const controller = new DisableMfaAuthController(new FakeDisableMfaAuthUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token', mfaEnrollmentId: 'm1' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'Two-factor authentication disabled')
})
