import app from '@adonisjs/core/services/app'
import type { ApplicationService } from '@adonisjs/core/types'
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import env from '#start/env'
import fs from 'node:fs'

export default class FirebaseAdminProvider {
  constructor(protected appService: ApplicationService) {}

  async boot() {
    if (getApps().length > 0) {
      return
    }

    const raw = this.readServiceAccount()

    if (!raw) {
      return
    }

    const serviceAccount: ServiceAccount = {
      projectId: raw.project_id,
      privateKey: raw.private_key,
      clientEmail: raw.client_email,
    }

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    })
  }

  private readServiceAccount(): {
    project_id: string
    private_key: string
    client_email: string
  } | null {
    const serviceAccountFromEnv = env.get('FIREBASE_SERVICE_ACCOUNT_KEYS')

    if (serviceAccountFromEnv) {
      return JSON.parse(serviceAccountFromEnv) as {
        project_id: string
        private_key: string
        client_email: string
      }
    }

    const serviceAccountPath = app.makePath('config/firebase/serviceAccountKey.json')

    if (!fs.existsSync(serviceAccountPath)) {
      return null
    }

    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as {
      project_id: string
      private_key: string
      client_email: string
    }
  }
}
