import { type RemoveMissionStepDto } from '#app/modules/missions/application/dto/remove-mission-step.dto'

export abstract class RemoveMissionStepUseCase {
  abstract execute(id: RemoveMissionStepDto): Promise<void>
}
