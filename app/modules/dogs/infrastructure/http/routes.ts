import router from '@adonisjs/core/services/router'
//import { middleware } from '#start/kernel'
const CreateRobotDogController = () => import('./controllers/create-robot-dog.controller.js')
const DestroyRobotDogController = () => import('./controllers/destroy-robot-dog.controller.js')
const ShowRobotDogController = () => import('./controllers/show-robot-dog.controller.js')
const IndexRobotDogController = () => import('./controllers/index-robot-dog.controller.js')
const UpdateRobotDogController = () => import('./controllers/update-robot-dog.controller.js')
const ListUserRobotDogsController = () => import('./controllers/list-user-robot-dogs.controller.js')

router
  .group(() => {
    router.get('/', [IndexRobotDogController])
    router.get('/users/:id', [ListUserRobotDogsController])
    router.get('/:id', [ShowRobotDogController])
    router.post('/', [CreateRobotDogController])
    router.delete('/:id', [DestroyRobotDogController])
    router.put('/:id', [UpdateRobotDogController])
  })
  .prefix('/dogs')
//  .use(middleware.firebaseAuth())
