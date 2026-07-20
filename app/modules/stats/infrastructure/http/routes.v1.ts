import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const GetBackofficeStatsController = () =>
  import('./controllers/get-backoffice-stats.controller.js')

router
  .group(() => {
    router.get('/stats', [GetBackofficeStatsController])
  })
  .prefix('/api/v1/backoffice')
  .use(middleware.firebaseAuth())
