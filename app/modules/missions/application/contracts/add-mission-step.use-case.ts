import { AddMissionStepDto } from '#app/modules/missions/application/dto/add-mission-step.dto'

export abstract class AddMissionStepUseCase {
  abstract execute(dto: AddMissionStepDto): Promise<void>
}
