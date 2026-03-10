import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const IndexUserController = () =>
  import('#users/infrastructure/http/controllers/index.user.controller')
const ShowUserController = () =>
  import('#users/infrastructure/http/controllers/show.user.controller')
const UpdateUserController = () =>
  import('#users/infrastructure/http/controllers/update.user.controller')

router
  .group(() => {
    router.get('/', [IndexUserController, 'handle'])
    router.get('/:id', [ShowUserController, 'handle'])
    router.patch('/:id', [UpdateUserController, 'handle'])
  })
  .prefix('/users')
  .use(middleware.firebaseAuth())
