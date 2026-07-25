import { inject } from '@adonisjs/core'
import { Storage } from '@google-cloud/storage'
import env from '#start/env'
import { MissionReportRepository } from '#app/modules/missions/domain/contracts/mission-report.repository'
import { MissionReportStatus } from '#app/modules/missions/domain/enums/mission-report-status'
import { MissionReportNotReadyError } from '#app/modules/missions/domain/exceptions/mission-report-not-ready.error'
import { MissionReportNotFoundError } from '#app/modules/missions/domain/exceptions/mission-report-not-found.error'
import { MissionReportStorageMisconfiguredError } from '#app/modules/missions/domain/exceptions/mission-report-storage-misconfigured.error'
import type MissionReport from '#app/modules/missions/domain/entities/mission-report.entity'

const SIGNED_URL_TTL_MS = 15 * 60 * 1000

@inject()
export class GetMissionReportDownloadUrlUseCase {
  constructor(private readonly reportRepository: MissionReportRepository) {}

  /**
   * Charge le rapport et vérifie qu'il est prêt à être téléchargé, sans jamais
   * contacter GCS. Séparé de `getSignedUrl` pour que le controller puisse
   * autoriser l'accès (bouncer) entre les deux étapes : aucun appel GCS ne doit
   * avoir lieu avant que l'autorisation ne soit vérifiée.
   */
  async findReadyReport(missionRunId: string): Promise<MissionReport> {
    const report = await this.reportRepository.findByMissionRunId(missionRunId)
    if (!report) throw new MissionReportNotFoundError(missionRunId)
    if (report.status !== MissionReportStatus.READY || !report.gcsObjectPath) {
      throw new MissionReportNotReadyError(missionRunId)
    }
    return report
  }

  async getSignedUrl(report: MissionReport): Promise<string> {
    const bucketName = env.get('GCS_BUCKET_NAME')
    if (!bucketName) throw new MissionReportStorageMisconfiguredError()

    const storage = this.buildStorageClient()
    const [url] = await storage
      .bucket(bucketName)
      .file(report.gcsObjectPath!)
      .getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS })

    return url
  }

  private buildStorageClient(): Storage {
    const raw = env.get('GCS_SERVICE_ACCOUNT_KEY')
    if (!raw) return new Storage()

    const credentials = JSON.parse(raw) as {
      project_id: string
      private_key: string
      client_email: string
    }
    return new Storage({ projectId: credentials.project_id, credentials })
  }
}
