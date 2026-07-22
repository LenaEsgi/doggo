import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const StartMissionController = () => import('./controllers/start-mission.controller.js')
const StopMissionController = () => import('./controllers/stop-mission.controller.js')
const GetActiveMissionController = () => import('./controllers/get-active-mission.controller.js')
const ListRobotDiagnosticsController = () =>
  import('./controllers/list-robot-diagnostics.controller.js')

router
  .group(() => {
    router.get('/:id/mission', [GetActiveMissionController])
    router.post('/:id/mission', [StartMissionController])
    router.delete('/:id/mission', [StopMissionController])
  })
  .prefix('/api/v1/dogs')
  .use(middleware.firebaseAuth())

router
  .group(() => {
    router.get('/diagnostics', [ListRobotDiagnosticsController])
  })
  .prefix('/api/v1/backoffice')
  .use(middleware.firebaseAuth())
