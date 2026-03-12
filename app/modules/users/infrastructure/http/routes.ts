import router from '@adonisjs/core/services/router'
//import { middleware } from '#start/kernel'

const IndexUserController = () =>
  import('#users/infrastructure/http/controllers/index.user.controller')
const ShowUserController = () =>
  import('#users/infrastructure/http/controllers/show.user.controller')
const UpdateUserController = () =>
  import('#users/infrastructure/http/controllers/update.user.controller')
const AdoptUserDogController = () =>
  import('#users/infrastructure/http/controllers/adopt.user.dog.controller')
const AbandonUserDogController = () =>
  import('#users/infrastructure/http/controllers/abandon.user.dog.controller')
const ListRobotDogOwnersController = () =>
  import('#users/infrastructure/http/controllers/list.robot.dog.owners.controller')

router
  .group(() => {
    router.get('/', [IndexUserController, 'handle'])
    router.get('/dogs/:id', [ListRobotDogOwnersController, 'handle'])
    router.get('/:id', [ShowUserController, 'handle'])
    router.patch('/:id', [UpdateUserController, 'handle'])
    router.post('/:id/dogs/adopt', [AdoptUserDogController, 'handle'])
    router.post('/:id/dogs/abandon', [AbandonUserDogController, 'handle'])
  })
  .prefix('/users')
//  .use(middleware.firebaseAuth())
