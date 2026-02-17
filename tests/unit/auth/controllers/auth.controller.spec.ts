import { test } from '@japa/runner'
import AuthController from '#auth/infrastructure/controllers/auth.controller'
import { AuthService } from '#auth/application/contracts/auth.service'
import { FirebaseHttpError } from '#auth/infrastructure/providers/firebase_auth.provider'
import type {
  AuthTokens,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

class FakeAuthService extends AuthService {
  constructor(
    private readonly config: {
      shouldThrow?: boolean
      tokens: AuthTokens
    }
  ) {
    super()
  }

  async register() {
    if (this.config.shouldThrow) {
      throw new FirebaseHttpError('An account with this email already exists', 409, 'EMAIL_EXISTS')
    }

    return this.config.tokens
  }

  async login(): Promise<LoginResult> {
    return { mfaRequired: false, ...this.config.tokens }
  }

  async loginWithTotp(): Promise<AuthTokens> {
    return this.config.tokens
  }

  async sendPasswordReset(): Promise<void> {}

  async startTotpSetup(): Promise<TotpEnrollmentStart> {
    return {
      sessionInfo: 'session',
      sharedSecret: 'secret',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      otpauthUri: 'otpauth://x',
    }
  }

  async finalizeTotpSetup(): Promise<TotpFinalizeResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }

  async listMfaEnrollments(): Promise<MfaInfo[]> {
    return []
  }

  async disableMfa(): Promise<DisableMfaResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }

  async deleteAccount(): Promise<void> {}
}

function makeResponseCollector() {
  const out: { status?: number; body?: any } = {}

  return {
    out,
    response: {
      created: (body: any) => {
        out.status = 201
        out.body = body
        return body
      },
      ok: (body: any) => {
        out.status = 200
        out.body = body
        return body
      },
      badRequest: (body: any) => {
        out.status = 400
        out.body = body
        return body
      },
      status: (code: number) => ({
        send: (body: any) => {
          out.status = code
          out.body = body
          return body
        },
      }),
    },
  }
}

test('AuthController register returns 201 on success', async ({ assert }) => {
  const controller = new AuthController(
    new FakeAuthService({
      tokens: {
        localId: 'uid-1',
        email: 'john@example.com',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '3600',
      },
    })
  )

  const { response, out } = makeResponseCollector()

  await controller.register({
    request: {
      validateUsing: async () => ({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'SuperPassword123',
      }),
    },
    response,
  } as any)

  assert.equal(out.status, 201)
  assert.equal(out.body.user.email, 'john@example.com')
})

test('AuthController register maps firebase errors', async ({ assert }) => {
  const controller = new AuthController(
    new FakeAuthService({
      shouldThrow: true,
      tokens: {
        localId: 'uid-1',
        email: 'john@example.com',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '3600',
      },
    })
  )

  const { response, out } = makeResponseCollector()

  await controller.register({
    request: {
      validateUsing: async () => ({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        password: 'SuperPassword123',
      }),
    },
    response,
  } as any)

  assert.equal(out.status, 409)
  assert.equal(out.body.error, 'EMAIL_EXISTS')
})
