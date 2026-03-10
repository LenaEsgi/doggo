import { test } from '@japa/runner'
import type { ListMfaEnrollmentsDto } from '#auth/application/dto/list-mfa-enrollments.dto'
import type { MfaInfo } from '#auth/domain/types/mfa.info'
import ListMfaEnrollmentsAuthController from '#auth/infrastructure/http/controllers/list.mfa.enrollments.auth.controller'

class FakeListMfaEnrollmentsAuthUseCase {
  async execute(_payload: ListMfaEnrollmentsDto): Promise<MfaInfo[]> {
    return [{ mfaEnrollmentId: 'm1', displayName: 'Aegis' }]
  }
}

test('ListMfaEnrollmentsAuthController returns enrollments', async ({ assert }) => {
  const controller = new ListMfaEnrollmentsAuthController(
    new FakeListMfaEnrollmentsAuthUseCase() as any
  )
  const out: { status?: number; body?: any } = {}

  await controller.handle({
    request: {
      validateUsing: async () => ({}),
      header: (name: string) => (name === 'authorization' ? 'Bearer id-token' : null),
    },
    response: { ok: (body: any) => ((out.status = 200), (out.body = body), body) },
    logger: { info: () => {} },
  } as any)

  assert.equal(out.status, 200)
  assert.equal(out.body.enrollments[0].mfaEnrollmentId, 'm1')
})
