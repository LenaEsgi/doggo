import transmit from '@adonisjs/transmit/services/main'
import { middleware } from '#start/kernel'

transmit.registerRoutes((route) => {
  // EventSource (GET) ne supporte pas les headers custom — pas d'auth ici
  // L'authentification se fait sur les routes POST (subscribe/unsubscribe)
  if (
    route.getPattern() === '__transmit/subscribe' ||
    route.getPattern() === '__transmit/unsubscribe'
  ) {
    route.middleware(middleware.firebaseAuth())
  }
})

import './routes/swagger.js'
import '../app/modules/auth/infrastructure/http/routes.v1.js'
import '../app/modules/users/infrastructure/http/routes.v1.js'
import '../app/modules/dogs/infrastructure/http/routes.v1.js'
import '../app/modules/missions/infrastructure/http/routes.v1.js'
import '../app/modules/actions/infrastructure/http/routes.v1.js'
import '../app/modules/notifications/infrastructure/http/routes.v1.js'
