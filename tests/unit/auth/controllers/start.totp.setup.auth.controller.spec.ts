import { test } from '@japa/runner'
import StartTotpSetupAuthController from '#auth/infrastructure/controllers/start.totp.setup.auth.controller'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import type { StartTotpSetupDto } from '#auth/application/dto/start_totp_setup.dto'
import type { TotpEnrollmentStart } from '#auth/domain/types/auth.types'

class FakeStartTotpSetupAuthService extends StartTotpSetupAuthService {
  async startTotpSetup(_payload: StartTotpSetupDto): Promise<TotpEnrollmentStart> {
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
  const controller = new StartTotpSetupAuthController(new FakeStartTotpSetupAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.setup.sharedSecret, 'secret')
})
