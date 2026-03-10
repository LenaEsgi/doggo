import { test } from '@japa/runner'
import type { FinalizeTotpSetupDto } from '#auth/application/dto/finalize-totp-setup.dto'
import type { TotpFinalizeResult } from '#auth/domain/types/totp.finalize.result'
import FinalizeTotpSetupAuthController from '#auth/infrastructure/http/controllers/finalize.totp.setup.auth.controller'

class FakeFinalizeTotpSetupAuthUseCase {
  async execute(_payload: FinalizeTotpSetupDto): Promise<TotpFinalizeResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }
}

test('FinalizeTotpSetupAuthController returns success payload', async ({ assert }) => {
  const controller = new FinalizeTotpSetupAuthController(
    new FakeFinalizeTotpSetupAuthUseCase() as any
  )
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      validateUsing: async () => ({
        sessionInfo: 'session',
        verificationCode: '123456',
      }),
      header: (name: string) => (name === 'authorization' ? 'Bearer id-token' : null),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.tokens.idToken, 'id')
})
