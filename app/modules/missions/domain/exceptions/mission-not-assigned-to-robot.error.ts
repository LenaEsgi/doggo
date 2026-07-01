import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotAssignedToRobotError extends DomainError {
  constructor(missionId: string, robotDogId: string) {
    super(`Mission ${missionId} is not assigned to robot dog ${robotDogId}`)
    this.name = 'MissionNotAssignedToRobotError'
  }
}
