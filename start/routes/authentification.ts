import router from '@adonisjs/core/services/router'

const RegisterAuthController = () => import('../../app/modules/auth/infrastructure/http/controllers/register.auth.controller')
const LoginAuthController = () => import('../../app/modules/auth/infrastructure/http/controllers/login.auth.controller')
const LoginWithTotpAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/login.with.totp.auth.controller')
const PasswordResetAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/password.reset.auth.controller')
const StartTotpSetupAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/start.totp.setup.auth.controller')
const FinalizeTotpSetupAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/finalize.totp.setup.auth.controller')
const ListMfaEnrollmentsAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/list.mfa.enrollments.auth.controller')
const DisableMfaAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/disable.mfa.auth.controller')
const DeleteAccountAuthController = () =>
  import('../../app/modules/auth/infrastructure/http/controllers/delete.account.auth.controller')

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
