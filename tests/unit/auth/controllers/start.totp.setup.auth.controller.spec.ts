import { test } from '@japa/runner'
import type { StartTotpSetupDto } from '#auth/application/dto/start-totp-setup.dto'
import type { TotpEnrollmentStart } from '#auth/domain/types/totp.enrollment.start'
import StartTotpSetupAuthController from '#auth/infrastructure/http/controllers/start.totp.setup.auth.controller'

class FakeStartTotpSetupAuthUseCase {
  async execute(_payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
    return {
      sessionInfo: 'session',
      sharedSecret: 'secret',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      otpauthUri: 'otpauth://x',
    }
  }
}

test('StartTotpSetupAuthController returns setup payload', async ({ assert }) => {
  const controller = new StartTotpSetupAuthController(new FakeStartTotpSetupAuthUseCase() as any)
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.setup.sharedSecret, 'secret')
})
