import router from '@adonisjs/core/services/router'

const RegisterAuthController = () => import('#auth/infrastructure/controllers/register.auth.controller')
const LoginAuthController = () => import('#auth/infrastructure/controllers/login.auth.controller')
const LoginWithTotpAuthController = () =>
  import('#auth/infrastructure/controllers/login.with.totp.auth.controller')
const PasswordResetAuthController = () =>
  import('#auth/infrastructure/controllers/password.reset.auth.controller')
const StartTotpSetupAuthController = () =>
  import('#auth/infrastructure/controllers/start.totp.setup.auth.controller')
const FinalizeTotpSetupAuthController = () =>
  import('#auth/infrastructure/controllers/finalize.totp.setup.auth.controller')
const ListMfaEnrollmentsAuthController = () =>
  import('#auth/infrastructure/controllers/list.mfa.enrollments.auth.controller')
const DisableMfaAuthController = () =>
  import('#auth/infrastructure/controllers/disable.mfa.auth.controller')
const DeleteAccountAuthController = () =>
  import('#auth/infrastructure/controllers/delete.account.auth.controller')

router
  .group(() => {
    router.post('/register', [RegisterAuthController, 'handle'])
    router.post('/login', [LoginAuthController, 'handle'])
    router.post('/login/2fa', [LoginWithTotpAuthController, 'handle'])
    router.post('/password-reset', [PasswordResetAuthController, 'handle'])
    router.post('/2fa/setup', [StartTotpSetupAuthController, 'handle'])
    router.post('/2fa/verify', [FinalizeTotpSetupAuthController, 'handle'])
    router.post('/2fa/enrollments', [ListMfaEnrollmentsAuthController, 'handle'])
    router.delete('/2fa', [DisableMfaAuthController, 'handle'])
    router.delete('/account', [DeleteAccountAuthController, 'handle'])
  })
  .prefix('/auth')
