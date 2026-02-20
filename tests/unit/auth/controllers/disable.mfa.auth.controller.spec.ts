import { test } from '@japa/runner'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import type { DisableMfaDto } from '#auth/application/dto/disable_mfa.dto'
import type { DisableMfaResult } from '#auth/domain/types/auth.types'
import DisableMfaAuthController from '#auth/infrastructure/http/controllers/disable.mfa.auth.controller'

class FakeDisableMfaAuthService extends DisableMfaAuthService {
  async disableMfa(_payload: DisableMfaDto): Promise<DisableMfaResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }
}

test('DisableMfaAuthController returns success payload', async ({ assert }) => {
  const controller = new DisableMfaAuthController(new FakeDisableMfaAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token', mfaEnrollmentId: 'm1' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'Two-factor authentication disabled')
})
