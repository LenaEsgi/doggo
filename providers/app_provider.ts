import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import { FinalizeTotpSetupAuthService } from '#auth/application/contracts/finalize.totp.setup.auth.service'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import { DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import { DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogRepositoryImplementation } from '#dogs/infrastructure/database/repositories/robot-dog.repository.implementation'
import type { ApplicationService } from '@adonisjs/core/types'
import { LocalUserRepositoryImplementation } from '#auth/infrastructure/database/repositories/local-user.repository'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  public async register() {
    const { DeleteAccountAuth } =
      await import('#auth/application/services/delete.account.auth.service')
    const { DisableMfaAuth } = await import('#auth/application/services/disable.mfa.auth.service')
    const { FinalizeTotpSetupAuth } =
      await import('#auth/application/services/finalize.totp.setup.auth.service')
    const { ListMfaEnrollmentsAuth } =
      await import('#auth/application/services/list.mfa.enrollments.auth.service')
    const { LoginAuth } = await import('#auth/application/services/login.auth.service')
    const { LoginWithTotpAuth } =
      await import('#auth/application/services/login.with.totp.auth.service')
    const { PasswordResetAuth } =
      await import('#auth/application/services/password.reset.auth.service')
    const { RegisterAuth } = await import('#auth/application/services/register.auth.service')
    const { StartTotpSetupAuth } =
      await import('#auth/application/services/start.totp.setup.auth.service')
    const { FirebaseDeleteAccountAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-delete-account-auth.provider')
    const { FirebaseDisableMfaAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-disable-mfa-auth.provider')
    const { FirebaseFinalizeTotpSetupAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-finalize-totp-setup-auth.provider')
    const { FirebaseListMfaEnrollmentsAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-list-mfa-enrollments-auth.provider')
    const { FirebaseLoginAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-login-auth.provider')
    const { FirebaseLoginWithTotpAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-login-with-totp-auth.provider')
    const { FirebasePasswordResetAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-password-reset-auth.provider')
    const { FirebaseRegisterAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-register-auth.provider')
    const { FirebaseStartTotpSetupAuthProvider } =
      await import('#auth/infrastructure/providers/firebase-start-totp-setup-auth.provider')

    const { UserRepositoryImplementation } =
      await import('#users/infrastructure/database/repositories/user.repository.implementation')

    this.app.container.bind(UserReadRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(UserWriteRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(LocalUserRepository, () => {
      return this.app.container.make(LocalUserRepositoryImplementation)
    })

    this.app.container.bind(RegisterAuthProvider, () => {
      return this.app.container.make(FirebaseRegisterAuthProvider)
    })
    this.app.container.bind(LoginAuthProvider, () => {
      return this.app.container.make(FirebaseLoginAuthProvider)
    })
    this.app.container.bind(LoginWithTotpAuthProvider, () => {
      return this.app.container.make(FirebaseLoginWithTotpAuthProvider)
    })
    this.app.container.bind(PasswordResetAuthProvider, () => {
      return this.app.container.make(FirebasePasswordResetAuthProvider)
    })
    this.app.container.bind(StartTotpSetupAuthProvider, () => {
      return this.app.container.make(FirebaseStartTotpSetupAuthProvider)
    })
    this.app.container.bind(FinalizeTotpSetupAuthProvider, () => {
      return this.app.container.make(FirebaseFinalizeTotpSetupAuthProvider)
    })
    this.app.container.bind(ListMfaEnrollmentsAuthProvider, () => {
      return this.app.container.make(FirebaseListMfaEnrollmentsAuthProvider)
    })
    this.app.container.bind(DisableMfaAuthProvider, () => {
      return this.app.container.make(FirebaseDisableMfaAuthProvider)
    })
    this.app.container.bind(DeleteAccountAuthProvider, () => {
      return this.app.container.make(FirebaseDeleteAccountAuthProvider)
    })
    /**
     * The container bindings have booted
     */
    this.app.container.bind(RegisterAuthService, () => {
      return this.app.container.make(RegisterAuth)
    })
    this.app.container.bind(RobotDogRepository, () => {
      return this.app.container.make(RobotDogRepositoryImplementation)
    })

    this.app.container.bind(LoginAuthService, () => {
      return this.app.container.make(LoginAuth)
    })

    this.app.container.bind(LoginWithTotpAuthService, () => {
      return this.app.container.make(LoginWithTotpAuth)
    })

    this.app.container.bind(PasswordResetAuthService, () => {
      return this.app.container.make(PasswordResetAuth)
    })

    this.app.container.bind(StartTotpSetupAuthService, () => {
      return this.app.container.make(StartTotpSetupAuth)
    })

    this.app.container.bind(FinalizeTotpSetupAuthService, () => {
      return this.app.container.make(FinalizeTotpSetupAuth)
    })

    this.app.container.bind(ListMfaEnrollmentsAuthService, () => {
      return this.app.container.make(ListMfaEnrollmentsAuth)
    })

    this.app.container.bind(DisableMfaAuthService, () => {
      return this.app.container.make(DisableMfaAuth)
    })

    this.app.container.bind(DeleteAccountAuthService, () => {
      return this.app.container.make(DeleteAccountAuth)
    })
  }
}
