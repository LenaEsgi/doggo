import { inject } from '@adonisjs/core'
import { RobotDiagnosticEventRepository } from '#app/modules/robot-communication/domain/contracts/robot-diagnostic-event.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { type ListRobotDiagnosticEventsFiltersDto } from '#app/modules/robot-communication/application/dto/list-robot-diagnostic-events-filters.dto'
import { type RobotDiagnosticEventWithDogNameDto } from '#app/modules/robot-communication/application/dto/robot-diagnostic-event-with-dog-name.dto'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

@inject()
export class ListRobotDiagnosticEventsUseCase {
  constructor(
    private readonly diagnosticRepository: RobotDiagnosticEventRepository,
    private readonly dogRepository: RobotDogRepository
  ) {}

  async execute(
    filters: ListRobotDiagnosticEventsFiltersDto
  ): Promise<PaginatedResult<RobotDiagnosticEventWithDogNameDto>> {
    const result = await this.diagnosticRepository.findAll(filters)

    const dogIds = [...new Set(result.data.map((event) => event.dogId))]
    const dogs = await this.dogRepository.findByIds(dogIds)
    const dogNameById = new Map(dogs.map((dog) => [dog.id.value, dog.name]))

    return {
      data: result.data.map((event) => ({
        event,
        dogName: dogNameById.get(event.dogId) ?? 'Unknown robot',
      })),
      meta: result.meta,
    }
  }
}
