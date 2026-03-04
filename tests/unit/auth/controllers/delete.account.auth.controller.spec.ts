import { test } from '@japa/runner'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import type { DeleteAccountDto } from '#auth/application/dto/delete-account.dto'
import DeleteAccountAuthController from '#auth/infrastructure/http/controllers/delete.account.auth.controller'

class FakeDeleteAccountAuthService extends DeleteAccountAuthService {
  async deleteAccount(_payload: DeleteAccountDto): Promise<void> {}
}

test('DeleteAccountAuthController returns success payload', async ({ assert }) => {
  const controller = new DeleteAccountAuthController(new FakeDeleteAccountAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.message, 'Account deleted successfully')
})
