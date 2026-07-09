import { inject } from '@adonisjs/core'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { RobotCommunicationService } from '#app/modules/robot-communication/domain/contracts/robot-communication.service'
import { InvalidRobotCommandError } from '#app/modules/robot-communication/domain/exceptions/invalid-robot-command.error'
import { RobotCommand } from '#app/modules/robot-communication/domain/types/robot-command.type'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionRunRepository } from '#app/modules/missions/domain/contracts/mission-run.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { MissionNotFoundError } from '#app/modules/missions/domain/exceptions/invalid-mission-not-fout.error'
import { MissionNotAssignedToRobotError } from '#app/modules/missions/domain/exceptions/mission-not-assigned-to-robot.error'
import MissionRun from '#app/modules/missions/domain/entities/mission-run.entity'

@inject()
export class StartMissionCommandUseCase {
  readonly command = RobotCommand.START_MISSION

  constructor(
    private readonly dogRepository: RobotDogRepository,
    private readonly communicationService: RobotCommunicationService,
    private readonly missionRepository: MissionRepository,
    private readonly missionRunRepository: MissionRunRepository
  ) {}

  async execute(dogId: string, missionId?: string): Promise<MissionRun> {
    if (!missionId) {
      throw new InvalidRobotCommandError('missionId is required for START_MISSION command')
    }

    const dog = await this.dogRepository.findById(RobotDogId.fromString(dogId))
    if (!dog) {
      throw new RobotDogNotFoundError(dogId)
    }

    const isAssigned = await this.missionRepository.isAssignedToDog(missionId, dogId)
    if (!isAssigned) {
      throw new MissionNotAssignedToRobotError(missionId, dogId)
    }

    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) {
      throw new MissionNotFoundError(missionId)
    }

    dog.validateForMission()
    const run = MissionRun.start(
      mission.id,
      dog.id,
      mission.missionSteps.map((step) => step.id)
    )

    await this.communicationService.sendCommand(dogId, this.command, missionId)

    await this.missionRunRepository.save(run)

    return run
  }
}
