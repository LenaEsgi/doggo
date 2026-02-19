import { test } from '@japa/runner'
import RegisterAuthController from '#auth/infrastructure/controllers/register.auth.controller'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import { FirebaseHttpError } from '#auth/infrastructure/providers/firebase_auth.provider'
import type { RegisterDto } from '#auth/application/dto/register.dto'
import type { AuthTokens } from '#auth/domain/types/auth.types'

class FakeRegisterAuthService extends RegisterAuthService {
  constructor(private readonly shouldThrow = false) {
    super()
  }

  async register(_payload: RegisterDto): Promise<AuthTokens> {
    if (this.shouldThrow) {
      throw new FirebaseHttpError('An account with this email already exists', 409, 'EMAIL_EXISTS')
    }

    return {
      localId: 'uid-1',
      email: 'john@example.com',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    }
  }
}

function responseCollector() {
  const out: { status?: number; body?: any } = {}
  return {
    out,
    response: {
      created: (body: any) => ((out.status = 201), (out.body = body), body),
      status: (code: number) => ({ send: (body: any) => ((out.status = code), (out.body = body), body) }),
      badRequest: (body: any) => ((out.status = 400), (out.body = body), body),
    },
  }
}

test('RegisterAuthController returns 201 on success', async ({ assert }) => {
  const controller = new RegisterAuthController(new FakeRegisterAuthService())
  const { response, out } = responseCollector()

  await controller.handle({
    request: { validateUsing: async () => ({ firstname: 'John', lastname: 'Doe', email: 'john@example.com', password: 'SuperPassword123' }) },
    response,
  } as any)

  assert.equal(out.status, 201)
  assert.equal(out.body.user.email, 'john@example.com')
})

test('RegisterAuthController maps firebase errors', async ({ assert }) => {
  const controller = new RegisterAuthController(new FakeRegisterAuthService(true))
  const { response, out } = responseCollector()

  await controller.handle({
    request: { validateUsing: async () => ({ firstname: 'John', lastname: 'Doe', email: 'john@example.com', password: 'SuperPassword123' }) },
    response,
  } as any)

  assert.equal(out.status, 409)
  assert.equal(out.body.error, 'EMAIL_EXISTS')
})
