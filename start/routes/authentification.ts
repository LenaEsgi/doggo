import router from '@adonisjs/core/services/router'

const AuthController = () => import('../../app/modules/auth/infrastructure/controllers/auth.controller.js')

router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/login', [AuthController, 'login'])
    router.post('/login/2fa', [AuthController, 'loginWithTotp'])
    router.post('/password-reset', [AuthController, 'sendPasswordReset'])
    router.post('/2fa/setup', [AuthController, 'startTotpSetup'])
    router.post('/2fa/verify', [AuthController, 'finalizeTotpSetup'])
    router.post('/2fa/enrollments', [AuthController, 'listMfaEnrollments'])
    router.delete('/2fa', [AuthController, 'disableMfa'])
  })
  .prefix('/auth')
