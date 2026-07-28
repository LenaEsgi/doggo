import { defineConfig } from '@adonisjs/cors'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

// URL Firebase Hosting par défaut du projet — reste active en parallèle du
// domaine personnalisé (Firebase ne la désactive jamais), donc toujours
// autorisée en plus de FRONTEND_URL pendant/après la migration vers le
// domaine personnalisé.
const FIREBASE_DEFAULT_ORIGIN = 'https://doggo-63933.web.app'

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
    : [env.get('FRONTEND_URL'), FIREBASE_DEFAULT_ORIGIN],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
