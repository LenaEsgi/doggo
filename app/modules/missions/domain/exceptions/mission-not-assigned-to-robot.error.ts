import { DomainError } from '#app/modules/share/exceptions/domain-error'

export class MissionNotAssignedToRobotError extends DomainError {
  readonly code = 'MISSION_NOT_ASSIGNED_TO_ROBOT'

  constructor(
    public readonly missionId: string,
    public readonly robotDogId: string
  ) {
    super(`Mission ${missionId} is not assigned to robot dog ${robotDogId}`, {
      missionId,
      robotDogId,
    })
    this.name = 'MissionNotAssignedToRobotError'
  }
}
