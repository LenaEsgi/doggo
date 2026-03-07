import { type CreateMissionDto } from '../dto/create-mission.dto.js'

export abstract class CreateMissionUseCase {
  abstract execute(dto: CreateMissionDto): Promise<void>
}
