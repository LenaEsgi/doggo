import type { AuthProvider } from '../../domain/contracts/auth.provider.js'
import type { LocalUserRepository } from '../../domain/contracts/local_user.repository.js'

export class AuthUseCase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async register(payload: {
    firstname: string
    lastname: string
    email: string
    password: string
  }) {
    const authUser = await this.authProvider.register(payload.email, payload.password)

    await this.localUserRepository.ensureUserProfile({
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
    })

    return authUser
  }

  async login(payload: { email: string; password: string }) {
    return this.authProvider.login(payload.email, payload.password)
  }

  async loginWithTotp(payload: {
    pendingCredential: string
    mfaEnrollmentId: string
    verificationCode: string
  }) {
    return this.authProvider.completeMfaLogin(
      payload.pendingCredential,
      payload.mfaEnrollmentId,
      payload.verificationCode
    )
  }

  async sendPasswordReset(payload: { email: string }) {
    return this.authProvider.sendPasswordResetEmail(payload.email)
  }

  async startTotpSetup(payload: { idToken: string }) {
    return this.authProvider.startTotpEnrollment(payload.idToken)
  }

  async finalizeTotpSetup(payload: {
    idToken: string
    sessionInfo: string
    verificationCode: string
    displayName?: string
  }) {
    return this.authProvider.finalizeTotpEnrollment(
      payload.idToken,
      payload.sessionInfo,
      payload.verificationCode,
      payload.displayName
    )
  }

  async listMfaEnrollments(payload: { idToken: string }) {
    return this.authProvider.listEnrollments(payload.idToken)
  }

  async disableMfa(payload: { idToken: string; mfaEnrollmentId: string }) {
    return this.authProvider.disableMfa(payload.idToken, payload.mfaEnrollmentId)
  }
}
