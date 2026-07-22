import { DateTime } from 'luxon'
import { type RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { type RobotDiagnosticEventType } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-event-type'
import { type RobotDiagnosticSeverity } from '#app/modules/robot-communication/domain/enums/robot-diagnostic-severity'
import RobotDiagnosticEventModel from '#app/modules/robot-communication/infrastructure/database/models/robot-diagnostic-event'
import { type ListRobotDiagnosticEventsFiltersDto } from '#app/modules/robot-communication/application/dto/list-robot-diagnostic-events-filters.dto'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export class RobotDiagnosticEventRepositoryImplementation implements RobotDiagnosticEventRepository {
  async save(event: RobotDiagnosticEvent): Promise<void> {
    await RobotDiagnosticEventModel.create({
      id: event.id,
      dogId: event.dogId,
      type: event.type,
      severity: event.severity,
      payload: event.payload,
      occurredAt: DateTime.fromJSDate(event.occurredAt),
    })
  }

  async findAll(
    filters: ListRobotDiagnosticEventsFiltersDto = {}
  ): Promise<PaginatedResult<RobotDiagnosticEvent>> {
    const { page = 1, limit = 20, dogId, type, severity, from, to } = filters
    const query = RobotDiagnosticEventModel.query().orderBy('occurred_at', 'desc')

    if (dogId) query.where('dog_id', dogId)
    if (type) query.where('type', type)
    if (severity) query.where('severity', severity)
    if (from) query.where('occurred_at', '>=', DateTime.fromJSDate(from).toSQL()!)
    if (to) query.where('occurred_at', '<=', DateTime.fromJSDate(to).toSQL()!)

    const paginated = await query.paginate(page, limit)

    const data = paginated
      .all()
      .map((row) =>
        RobotDiagnosticEvent.rehydrate(
          row.id,
          row.dogId,
          row.type as RobotDiagnosticEventType,
          row.severity as RobotDiagnosticSeverity,
          row.payload,
          row.occurredAt.toJSDate()
        )
      )

    return {
      data,
      meta: {
        total: paginated.total,
        perPage: paginated.perPage,
        currentPage: paginated.currentPage,
        firstPage: paginated.firstPage,
        lastPage: paginated.lastPage,
      },
    }
  }
}
