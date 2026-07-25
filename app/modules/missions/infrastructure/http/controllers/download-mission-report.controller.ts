import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GetMissionReportDownloadUrlUseCase } from '#app/modules/missions/application/usecases/get-mission-report-download-url.use-case'

@inject()
export default class DownloadMissionReportController {
  constructor(private readonly useCase: GetMissionReportDownloadUrlUseCase) {}

  async handle({ params, bouncer, response }: HttpContext) {
    const report = await this.useCase.findReadyReport(params.id)
    await bouncer.with('MissionPolicy').authorize('downloadReport', report.robotDogId)

    const url = await this.useCase.getSignedUrl(report)
    return response.ok({ url })
  }
}
