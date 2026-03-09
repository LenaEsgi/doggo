import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import { FinalizeTotpSetupAuthService } from '#auth/application/contracts/finalize.totp.setup.auth.service'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
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
    /**
     * The container bindings have booted
     */
    this.app.container.bind(RegisterAuthService, () => {
      return this.app.container.make(RegisterAuth)
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
