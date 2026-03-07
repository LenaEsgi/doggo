import type Mission from '#app/modules/missions/domain/entities/mission.entity'

export abstract class ShowMissionUseCase {
  abstract execute(id: string): Promise<Mission>
}
