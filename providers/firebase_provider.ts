import type { ApplicationService } from '@adonisjs/core/types'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
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
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import { DeleteAccountAuth } from '#auth/application/services/delete.account.auth.service'
import { DisableMfaAuth } from '#auth/application/services/disable.mfa.auth.service'
import { FinalizeTotpSetupAuth } from '#auth/application/services/finalize.totp.setup.auth.service'
import { ListMfaEnrollmentsAuth } from '#auth/application/services/list.mfa.enrollments.auth.service'
import { LoginAuth } from '#auth/application/services/login.auth.service'
import { LoginWithTotpAuth } from '#auth/application/services/login.with.totp.auth.service'
import { PasswordResetAuth } from '#auth/application/services/password.reset.auth.service'
import { RegisterAuth } from '#auth/application/services/register.auth.service'
import { StartTotpSetupAuth } from '#auth/application/services/start.totp.setup.auth.service'
import { FirebaseDeleteAccountAuthProvider } from '#auth/infrastructure/providers/firebase-delete-account-auth.provider'
import { FirebaseDisableMfaAuthProvider } from '#auth/infrastructure/providers/firebase-disable-mfa-auth.provider'
import { FirebaseAdminTokenVerifier } from '#middleware/auth/contracts/firebase-admin-token-verifier'
import { FirebaseFinalizeTotpSetupAuthProvider } from '#auth/infrastructure/providers/firebase-finalize-totp-setup-auth.provider'
import { FirebaseListMfaEnrollmentsAuthProvider } from '#auth/infrastructure/providers/firebase-list-mfa-enrollments-auth.provider'
import { FirebaseLoginAuthProvider } from '#auth/infrastructure/providers/firebase-login-auth.provider'
import { FirebaseLoginWithTotpAuthProvider } from '#auth/infrastructure/providers/firebase-login-with-totp-auth.provider'
import { FirebasePasswordResetAuthProvider } from '#auth/infrastructure/providers/firebase-password-reset-auth.provider'
import { FirebaseRegisterAuthProvider } from '#auth/infrastructure/providers/firebase-register-auth.provider'
import { FirebaseStartTotpSetupAuthProvider } from '#auth/infrastructure/providers/firebase-start-totp-setup-auth.provider'

export default class FirebaseProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(FirebaseTokenVerifier, () => {
      return this.app.container.make(FirebaseAdminTokenVerifier)
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
