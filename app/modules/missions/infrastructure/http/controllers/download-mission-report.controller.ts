import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { GetMissionReportDownloadUrlUseCase } from '#app/modules/missions/application/usecases/get-mission-report-download-url.use-case'

@inject()
export default class DownloadMissionReportController {
  constructor(private readonly useCase: GetMissionReportDownloadUrlUseCase) {}

  async handle({ params, bouncer, response }: HttpContext) {
    const { url, report } = await this.useCase.execute(params.id)
    await bouncer.with('MissionPolicy').authorize('downloadReport', report.robotDogId)

    return response.ok({ url })
  }
}
