/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import transmit from '@adonisjs/transmit/services/main'
import { middleware } from '#start/kernel'

transmit.registerRoutes((route) => {
  if (route.getPattern() === '__transmit/events') {
    route.middleware(middleware.auth())
  }
})

import './routes/swagger.js'
import '../app/modules/users/infrastructure/http/routes.js'
import '../app/modules/auth/infrastructure/http/routes.js'
import '../app/modules/dogs/infrastructure/http/routes.js'
import '../app/modules/missions/infrastructure/http/routes.js'
import '../app/modules/actions/infrastructure/http/routes.js'
