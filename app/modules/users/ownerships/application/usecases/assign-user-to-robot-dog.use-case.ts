// app/modules/users/ownerships/application/usecases/assign-user-to-robot-dog.use-case.ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class AssignUserToRobotDogUseCase {
  constructor(
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly userGateway: UserOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(robotDogId: string, targetUserId: string): Promise<void> {
    logger.info({ robotDogId, targetUserId }, 'AssignUserToRobotDogUseCase started')

    const robotDogExists = await this.robotDogGateway.existsById(robotDogId)
    if (!robotDogExists) {
      logger.warn({ robotDogId }, 'RobotDog not found in AssignUserToRobotDogUseCase')
      throw new RobotDogNotFoundError(robotDogId)
    }

    const targetUserExists = await this.userGateway.existsById(targetUserId)
    if (!targetUserExists) {
      logger.warn({ targetUserId }, 'Target user not found in AssignUserToRobotDogUseCase')
      throw new InvalidUserNotFoundError(targetUserId)
    }

    const alreadyOwner = await this.ownershipReadRepository.isOwner(targetUserId, robotDogId)
    if (alreadyOwner) {
      logger.warn(
        { robotDogId, targetUserId },
        'Ownership already exists in AssignUserToRobotDogUseCase'
      )
      throw new OwnershipAlreadyExistsError(targetUserId, robotDogId)
    }

    await this.ownershipWriteRepository.adopt(targetUserId, robotDogId, new Date())

    logger.info({ robotDogId, targetUserId }, 'AssignUserToRobotDogUseCase completed successfully')
  }
}
