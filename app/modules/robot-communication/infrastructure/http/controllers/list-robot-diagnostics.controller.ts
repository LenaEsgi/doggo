import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { ListRobotDiagnosticEventsUseCase } from '#app/modules/robot-communication/application/use-cases/list-robot-diagnostic-events.use-case'
import RobotDiagnosticsPolicy from '#app/modules/robot-communication/application/policies/robot-diagnostics.policy'
import { RobotDiagnosticEventSerializer } from '#app/modules/robot-communication/infrastructure/http/serializers/robot-diagnostic-event.serializer'
import { RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'

@inject()
export default class ListRobotDiagnosticsController {
  constructor(private readonly useCase: ListRobotDiagnosticEventsUseCase) {}

  async handle({ request, response, bouncer }: HttpContext) {
    await bouncer.with(RobotDiagnosticsPolicy).authorize('index')

    const from = request.input('from')
    const to = request.input('to')

    const result = await this.useCase.execute({
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      dogId: request.input('dogId') || undefined,
      type: (request.input('type') as RobotDiagnosticEventType) || undefined,
      severity: (request.input('severity') as RobotDiagnosticSeverity) || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    })

    response.ok({
      data: RobotDiagnosticEventSerializer.collection(result.data),
      meta: result.meta,
    })
  }
}
