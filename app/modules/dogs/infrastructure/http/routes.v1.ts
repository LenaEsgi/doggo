import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const CreateRobotDogController = () => import('./controllers/create-robot-dog.controller.js')
const DestroyRobotDogController = () => import('./controllers/destroy-robot-dog.controller.js')
const ShowRobotDogController = () => import('./controllers/show-robot-dog.controller.js')
const IndexRobotDogController = () => import('./controllers/index-robot-dog.controller.js')
const UpdateRobotDogController = () => import('./controllers/update-robot-dog.controller.js')
const FindRobotDogBySerialNumberController = () =>
  import('./controllers/find-robot-dog-by-serial-number.controller.js')

router
  .group(() => {
    router.get('/', [IndexRobotDogController])
    router.get('/:id', [ShowRobotDogController])
    router.post('/', [CreateRobotDogController])
    router.delete('/:id', [DestroyRobotDogController])
    router.put('/:id', [UpdateRobotDogController])
  })
  .prefix('/api/v1/dogs')
  .use(middleware.firebaseAuth())

// Pas de session utilisateur possible ici : appelé par le robot/simulateur
// lui-même au démarrage, avant toute authentification Firebase.
router
  .group(() => {
    router.get('/by-serial/:serialNumber', [FindRobotDogBySerialNumberController])
  })
  .prefix('/api/v1/dogs')
