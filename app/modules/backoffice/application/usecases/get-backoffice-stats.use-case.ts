import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { NotificationRepository } from '#app/modules/notifications/domain/contracts/notification.repository'

export type BackofficeStatsDto = {
  robotsCount: number
  usersCount: number
  ongoingMissionsCount: number
  alertsTodayCount: number
}

@inject()
export class GetBackofficeStatsUseCase {
  constructor(
    private readonly robotDogRepository: RobotDogRepository,
    private readonly userRepository: UserReadRepository,
    private readonly missionRunRepository: MissionRunRepository,
    private readonly notificationRepository: NotificationRepository
  ) {}

  async execute(): Promise<BackofficeStatsDto> {
    const [robots, users, activeRuns, alertsTodayCount] = await Promise.all([
      this.robotDogRepository.findAll({ page: 1, limit: 1 }),
      this.userRepository.findAll({ page: 1, limit: 1 }),
      this.missionRunRepository.listActiveRuns(),
      this.notificationRepository.countBySeverityToday(['critical', 'warning']),
    ])

    return {
      robotsCount: robots.meta.total,
      usersCount: users.meta.total,
      ongoingMissionsCount: activeRuns.length,
      alertsTodayCount,
    }
  }
}
