import { test } from '@japa/runner'
import { AuthServiceImplementation } from '#auth/application/services/auth.service.implementation'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'
import type {
  AuthTokens,
  DeleteAccountResult,
  DisableMfaResult,
  LoginResult,
  MfaInfo,
  TotpEnrollmentStart,
  TotpFinalizeResult,
} from '#auth/domain/types/auth.types'

class FakeAuthProvider extends AuthProvider {
  constructor(
    private readonly data: {
      registerResult: AuthTokens
      deleteAccountResult: DeleteAccountResult
    }
  ) {
    super()
  }

  async register(): Promise<AuthTokens> {
    return this.data.registerResult
  }

  async login(): Promise<LoginResult> {
    return { mfaRequired: false, ...this.data.registerResult }
  }

  async completeMfaLogin(): Promise<AuthTokens> {
    return this.data.registerResult
  }

  async sendPasswordResetEmail(): Promise<void> {}

  async startTotpEnrollment(): Promise<TotpEnrollmentStart> {
    return {
      sessionInfo: 'session',
      sharedSecret: 'secret',
      verificationCodeLength: 6,
      hashingAlgorithm: 'SHA1',
      periodSec: 30,
      otpauthUri: 'otpauth://x',
    }
  }

  async finalizeTotpEnrollment(): Promise<TotpFinalizeResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }

  async deleteAccount(): Promise<DeleteAccountResult> {
    return this.data.deleteAccountResult
  }

  async listEnrollments(): Promise<MfaInfo[]> {
    return []
  }

  async disableMfa(): Promise<DisableMfaResult> {
    return { idToken: 'id', refreshToken: 'refresh' }
  }
}

class FakeLocalUserRepository extends LocalUserRepository {
  public ensured: Array<{ firstname: string; lastname: string; email: string }> = []
  public deletedEmails: string[] = []

  async ensureUserProfile(payload: { firstname: string; lastname: string; email: string }) {
    this.ensured.push(payload)
  }

  async deleteByEmail(email: string) {
    this.deletedEmails.push(email)
  }
}

test.group('AuthServiceImplementation', () => {
  test('register creates firebase user and ensures local profile', async ({ assert }) => {
    const tokens: AuthTokens = {
      localId: 'uid-1',
      email: 'john@example.com',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    }

    const provider = new FakeAuthProvider({
      registerResult: tokens,
      deleteAccountResult: { email: 'john@example.com' },
    })
    const localRepo = new FakeLocalUserRepository()
    const service = new AuthServiceImplementation(provider, localRepo)

    const result = await service.register({
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      password: 'SuperPassword123',
    })

    assert.deepEqual(result, tokens)
    assert.lengthOf(localRepo.ensured, 1)
    assert.deepEqual(localRepo.ensured[0], {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
    })
  })

  test('deleteAccount removes local profile by firebase email', async ({ assert }) => {
    const provider = new FakeAuthProvider({
      registerResult: {
        localId: 'uid-1',
        email: 'john@example.com',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '3600',
      },
      deleteAccountResult: { email: 'john@example.com' },
    })
    const localRepo = new FakeLocalUserRepository()
    const service = new AuthServiceImplementation(provider, localRepo)

    await service.deleteAccount({ idToken: 'id-token' })

    assert.deepEqual(localRepo.deletedEmails, ['john@example.com'])
  })
})
