import type { RobotDogWithOwnersSummaryDto } from '#dogs/application/DTO/robot-dog-with-owners-summary.dto'

export class RobotDogSerializer {
  static toJson(summary: RobotDogWithOwnersSummaryDto) {
    return {
      id: summary.robotDog.id.value,
      serialNumber: summary.robotDog.serialNumber,
      name: summary.robotDog.name,
      state: summary.robotDog.state,
      batteryLevel: summary.robotDog.batteryLevel,
      lastHeartbeat: summary.robotDog.lastHeartbeat,
      users: {
        count: summary.usersCount,
        href: `/users/dogs/${summary.robotDog.id.value}`,
      },
    }
  }

  static collection(summaries: RobotDogWithOwnersSummaryDto[]) {
    return summaries.map((summary) => this.toJson(summary))
  }
}
