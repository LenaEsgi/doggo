import app from '@adonisjs/core/services/app'
import type { ApplicationService } from '@adonisjs/core/types'
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import fs from 'node:fs'

export default class FirebaseAdminProvider {
  constructor(protected appService: ApplicationService) {}

  async boot() {
    if (getApps().length > 0) {
      return
    }

    const serviceAccountPath = app.makePath('config/firebase/serviceAccountKey.json')
    const raw = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as {
      project_id: string
      private_key: string
      client_email: string
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
}
