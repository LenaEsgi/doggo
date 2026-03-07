import { type MoveMissionStepDto } from '#app/modules/missions/application/dto/move-mission-step.dto'

export abstract class MoveMissionStepUseCase {
  abstract execute(id: MoveMissionStepDto): Promise<void>
}
