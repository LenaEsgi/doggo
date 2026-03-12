import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class AdoptRobotDogUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(userId: string, robotDogId: string): Promise<void> {
    logger.info({ userId, robotDogId }, 'AdoptRobotDogUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId, robotDogId }, 'User not found in AdoptRobotDogUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const robotDogExists = await this.robotDogGateway.existsById(robotDogId)
    if (!robotDogExists) {
      logger.warn({ userId, robotDogId }, 'RobotDog not found in AdoptRobotDogUseCase')
      throw new RobotDogNotFoundError(robotDogId)
    }

    await this.ownershipWriteRepository.adopt(userId, robotDogId, new Date())

    logger.info({ userId, robotDogId }, 'AdoptRobotDogUseCase completed successfully')
  }
}
