import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const MeUserV2Controller = () =>
  import('#users/infrastructure/http/controllers/me.user.v2.controller')

// Ne couvre que les routes qui changent en v2 ; le reste du module users
// (index, show, update, dogs...) n'existe qu'en v1 pour le moment.
router
  .group(() => {
    router.get('/me', [MeUserV2Controller, 'handle'])
  })
  .prefix('/api/v2/users')
  .use(middleware.firebaseAuth())
