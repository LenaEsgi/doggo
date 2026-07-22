import { type RobotDiagnosticEvent } from '#app/modules/robot-communication/domain/entities/robot-diagnostic-event.entity'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { type ListRobotDiagnosticEventsFiltersDto } from '#app/modules/robot-communication/application/dto/list-robot-diagnostic-events-filters.dto'

export abstract class RobotDiagnosticEventRepository {
  abstract save(event: RobotDiagnosticEvent): Promise<void>
  abstract findAll(
    filters: ListRobotDiagnosticEventsFiltersDto
  ): Promise<PaginatedResult<RobotDiagnosticEvent>>
}
