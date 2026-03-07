import { type UpdateMissionDto } from '../dto/update-mission.dto.js'

export abstract class UpdateMissionUseCase {
  abstract execute(dto: UpdateMissionDto): Promise<void>
}
