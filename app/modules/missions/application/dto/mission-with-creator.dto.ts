import type { User } from '#users/domain/user.entity'
import type Mission from '#app/modules/missions/domain/entities/mission.entity'

export type MissionWithCreatorDto = {
  mission: Mission
  creator: User | null
}
