import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ListNotificationsController = () =>
  import('./controllers/list-notifications.controller.js')
const MarkNotificationsReadController = () =>
  import('./controllers/mark-notifications-read.controller.js')

router
  .group(() => {
    router.get('/', [ListNotificationsController])
    router.patch('/read', [MarkNotificationsReadController])
  })
  .prefix('/api/v1/notifications')
  .use(middleware.firebaseAuth())
