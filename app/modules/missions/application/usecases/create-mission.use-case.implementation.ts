import { MissionRepository } from '../../domain/contracts/mission.repository.js'
import { CreateMissionDto } from '../dto/create-mission.dto.js'
import { inject } from '@adonisjs/core'
import { CreateMissionUseCase } from '../contracts/create-mission.use-case.js'
import logger from '@adonisjs/core/services/logger'
import Mission from '#app/modules/missions/domain/entities/mission.entity'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { RobotDogNotFoundError } from '#app/modules/dogs/domain/exceptions/robot-dog-not-found.error'
import { UserGateway } from '../contracts/user.gateway.ts'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class CreateMissionUseCaseImplementation implements CreateMissionUseCase {
  constructor(
    private missionRepository: MissionRepository,
    private robotDogGateway: RobotDogGateway,
    private userGateway: UserGateway,
  ) {}

  async execute(dto: CreateMissionDto) {
    logger.info('CreateMissionUseCase started', { dto })

    const robotDogId = RobotDogId.fromString(dto.robotDogId)

    const robotDog = await this.robotDogGateway.findBy(robotDogId)
    if (!robotDog) {
      throw new RobotDogNotFoundError(
        `Robot Dog with id ${robotDogId.value} not found`
      )
    }

    const user = await this.userGateway.findBy(dto.userId)
    if (!user) {
      throw new InvalidUserNotFoundError(
        `user with id ${dto.userId} not found`
      )
    }


    const mission = Mission.create(dto.name, dto.userId)
    await this.missionRepository.save(mission)
  }
}
