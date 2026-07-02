import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SendRobotCommandController = () =>
  import('./controllers/send-robot-command.controller.js')

router
  .group(() => {
    router.post('/:id/commands', [SendRobotCommandController])
  })
  .prefix('/api/v1/dogs')
  .use(middleware.firebaseAuth())
