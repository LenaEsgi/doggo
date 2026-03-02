
import { ShowMissionDto } from '../dto/show-mission.dto.js'
import { MissionOutputDto } from '../dto/mission.output.dto.js'

export abstract class ShowMissionUseCase {
  abstract execute(
    id: ShowMissionDto
  ): Promise<MissionOutputDto>
}