import { type DestroyMissionDto } from '../dto/destroy-mission.dto.js'

export abstract class DestroyMissionUseCase {
  abstract execute(dto: DestroyMissionDto): Promise<void>
}
