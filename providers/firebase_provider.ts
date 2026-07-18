import type { ApplicationService } from '@adonisjs/core/types'
import { DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import { DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import { FirebaseTokenVerifier } from '#middleware/auth/contracts/firebase-token-verifier'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
import { FirebaseAdminTokenVerifier } from '#middleware/auth/contracts/firebase-admin-token-verifier'
import { FirebaseDeleteAccountAuthProvider } from '#auth/infrastructure/providers/firebase-delete-account-auth.provider'
import { FirebaseDisableMfaAuthProvider } from '#auth/infrastructure/providers/firebase-disable-mfa-auth.provider'
import { FirebaseFinalizeTotpSetupAuthProvider } from '#auth/infrastructure/providers/firebase-finalize-totp-setup-auth.provider'
import { FirebaseListMfaEnrollmentsAuthProvider } from '#auth/infrastructure/providers/firebase-list-mfa-enrollments-auth.provider'
import { FirebaseLoginAuthProvider } from '#auth/infrastructure/providers/firebase-login-auth.provider'
import { FirebaseLoginWithTotpAuthProvider } from '#auth/infrastructure/providers/firebase-login-with-totp-auth.provider'
import { FirebasePasswordResetAuthProvider } from '#auth/infrastructure/providers/firebase-password-reset-auth.provider'
import { FirebaseRegisterAuthProvider } from '#auth/infrastructure/providers/firebase-register-auth.provider'
import { FirebaseStartTotpSetupAuthProvider } from '#auth/infrastructure/providers/firebase-start-totp-setup-auth.provider'
import { GoogleLoginAuthProvider } from '#auth/domain/contracts/google.login.auth.provider'
import { FirebaseGoogleLoginAuthProvider } from '#auth/infrastructure/providers/firebase-google-login-auth.provider'
import { SendEmailVerificationAuthProvider } from '#auth/domain/contracts/send.email.verification.auth.provider'
import { FirebaseSendEmailVerificationAuthProvider } from '#auth/infrastructure/providers/firebase-send-email-verification-auth.provider'

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
    this.app.container.bind(GoogleLoginAuthProvider, () => {
      return this.app.container.make(FirebaseGoogleLoginAuthProvider)
    })
    this.app.container.bind(SendEmailVerificationAuthProvider, () => {
      return this.app.container.make(FirebaseSendEmailVerificationAuthProvider)
    })
  }
}
