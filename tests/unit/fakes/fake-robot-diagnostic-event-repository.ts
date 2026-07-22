import { type RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { type ListRobotDiagnosticEventsFiltersDto } from '#app/modules/robot-communication/application/dto/list-robot-diagnostic-events-filters.dto'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

export class FakeRobotDiagnosticEventRepository extends RobotDiagnosticEventRepository {
  public storedEvents: RobotDiagnosticEvent[] = []

  async save(event: RobotDiagnosticEvent): Promise<void> {
    this.storedEvents.push(event)
  }

  async findAll(
    filters: ListRobotDiagnosticEventsFiltersDto = {}
  ): Promise<PaginatedResult<RobotDiagnosticEvent>> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20

    let events = [...this.storedEvents].sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
    )

    if (filters.dogId) events = events.filter((e) => e.dogId === filters.dogId)
    if (filters.type) events = events.filter((e) => e.type === filters.type)
    if (filters.severity) events = events.filter((e) => e.severity === filters.severity)
    if (filters.from) events = events.filter((e) => e.occurredAt >= filters.from!)
    if (filters.to) events = events.filter((e) => e.occurredAt <= filters.to!)

    const total = events.length
    const start = (page - 1) * limit
    const data = events.slice(start, start + limit)

    return {
      data,
      meta: {
        total,
        perPage: limit,
        currentPage: page,
        firstPage: 1,
        lastPage: Math.ceil(total / limit) || 1,
      },
    }
  }
}
