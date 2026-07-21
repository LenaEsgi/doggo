import { defineConfig } from '@adonisjs/cors'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

/**
 * https://docs.adonisjs.com/guides/security/cors
 *
 * En dev, le port du serveur Vite varie (5173, 5174, ... si le port par
 * défaut est déjà pris) : on accepte n'importe quel port sur localhost au
 * lieu de verrouiller sur FRONTEND_URL. En prod, on reste strict.
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: app.inDev
    ? (requestOrigin: string) => LOCALHOST_ORIGIN.test(requestOrigin)
    : [env.get('FRONTEND_URL')],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
