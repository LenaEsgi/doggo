import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const IndexUserController = () =>
  import('#users/infrastructure/http/controllers/index.user.controller')
const ShowUserController = () =>
  import('#users/infrastructure/http/controllers/show.user.controller')
const MeUserController = () => import('#users/infrastructure/http/controllers/me.user.controller')
const UpdateUserController = () =>
  import('#users/infrastructure/http/controllers/update.user.controller')
const AdoptUserDogController = () =>
  import('#users/infrastructure/http/controllers/adopt.user.dog.controller')
const AbandonUserDogController = () =>
  import('#users/infrastructure/http/controllers/abandon.user.dog.controller')
const ListRobotDogOwnersController = () =>
  import('#users/infrastructure/http/controllers/list.robot.dog.owners.controller')
const AssignUserDogController = () =>
  import('#users/infrastructure/http/controllers/assign.user.dog.controller')
const ListUserDogsController = () =>
  import('#users/infrastructure/http/controllers/list.user.dogs.controller')

router
  .group(() => {
    router.get('/', [IndexUserController, 'handle'])
    router.get('/me', [MeUserController, 'handle']).use(middleware.firebaseAuth())
    router.get('/dogs/:id', [ListRobotDogOwnersController, 'handle'])
    router.post('/dogs/assign', [AssignUserDogController, 'handle']).use(middleware.firebaseAuth())
    router.get('/:id', [ShowUserController, 'handle'])
    router.patch('/:id', [UpdateUserController, 'handle'])
    router.get('/:id/dogs', [ListUserDogsController, 'handle']).use(middleware.firebaseAuth())
    router.post('/:id/dogs/adopt', [AdoptUserDogController, 'handle'])
    router.post('/:id/dogs/abandon', [AbandonUserDogController, 'handle'])
  })
  .prefix('/users')
