import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RegisterAuthController = () =>
  import('#auth/infrastructure/http/controllers/register.auth.controller')
const LoginAuthController = () =>
  import('#auth/infrastructure/http/controllers/login.auth.controller')
const LoginWithTotpAuthController = () =>
  import('#auth/infrastructure/http/controllers/login.with.totp.auth.controller')
const PasswordResetAuthController = () =>
  import('#auth/infrastructure/http/controllers/password.reset.auth.controller')
const StartTotpSetupAuthController = () =>
  import('#auth/infrastructure/http/controllers/start.totp.setup.auth.controller')
const FinalizeTotpSetupAuthController = () =>
  import('#auth/infrastructure/http/controllers/finalize.totp.setup.auth.controller')
const ListMfaEnrollmentsAuthController = () =>
  import('#auth/infrastructure/http/controllers/list.mfa.enrollments.auth.controller')
const DisableMfaAuthController = () =>
  import('#auth/infrastructure/http/controllers/disable.mfa.auth.controller')
const DeleteAccountAuthController = () =>
  import('#auth/infrastructure/http/controllers/delete.account.auth.controller')
const GoogleLoginAuthController = () =>
  import('#auth/infrastructure/http/controllers/google.login.auth.controller')
const SendEmailVerificationAuthController = () =>
  import('#auth/infrastructure/http/controllers/send.email.verification.auth.controller')

router
  .group(() => {
    router.post('/register', [RegisterAuthController, 'handle'])
    router.post('/login', [LoginAuthController, 'handle'])
    router.post('/login/2fa', [LoginWithTotpAuthController, 'handle'])
    router.post('/password-reset', [PasswordResetAuthController, 'handle'])
    router.post('/google', [GoogleLoginAuthController, 'handle'])
    router.post('/send-email-verification', [SendEmailVerificationAuthController, 'handle'])
    router
      .post('/2fa/setup', [StartTotpSetupAuthController, 'handle'])
      .use(middleware.firebaseAuth())
    router
      .post('/2fa/verify', [FinalizeTotpSetupAuthController, 'handle'])
      .use(middleware.firebaseAuth())
    router
      .post('/2fa/enrollments', [ListMfaEnrollmentsAuthController, 'handle'])
      .use(middleware.firebaseAuth())
    router.delete('/2fa', [DisableMfaAuthController, 'handle']).use(middleware.firebaseAuth())
    router
      .delete('/account', [DeleteAccountAuthController, 'handle'])
      .use(middleware.firebaseAuth())
  })
  .prefix('/auth')
