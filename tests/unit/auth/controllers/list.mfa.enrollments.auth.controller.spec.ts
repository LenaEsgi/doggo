import { test } from '@japa/runner'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list_mfa_enrollments.dto'
import type { MfaInfo } from '#auth/domain/types/auth.types'
import ListMfaEnrollmentsAuthController
  from '#auth/infrastructure/http/controllers/list.mfa.enrollments.auth.controller'

class FakeListMfaEnrollmentsAuthService extends ListMfaEnrollmentsAuthService {
  async listMfaEnrollments(_payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return [{ mfaEnrollmentId: 'm1', displayName: 'Aegis' }]
  }
}

test('ListMfaEnrollmentsAuthController returns enrollments', async ({ assert }) => {
  const controller = new ListMfaEnrollmentsAuthController(new FakeListMfaEnrollmentsAuthService())
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: { validateUsing: async () => ({ idToken: 'id-token' }) },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.enrollments[0].mfaEnrollmentId, 'm1')
})
