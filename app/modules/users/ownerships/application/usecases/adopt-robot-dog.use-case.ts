import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { OwnershipAlreadyExistsError } from '#app/modules/users/ownerships/domain/exceptions/ownership-already-exists.error'
import { InvalidRobotDogKeyError } from '#dogs/domain/exceptions/invalid-robot-dog-key.error'
import { RobotDogKey } from '#dogs/domain/value-objects/robot-dog-key'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import OwnershipAssignedEvent from '#users/ownerships/domain/events/ownership-assigned.event'

@inject()
export class AdoptRobotDogUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository,
    private readonly ownershipWriteRepository: OwnershipWriteRepository
  ) {}

  async execute(userId: string, serialNumber: string, key: string): Promise<void> {
    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId, serialNumber }, 'User not found in AdoptRobotDogUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const robotDog = await this.robotDogGateway.findBySerialNumber(serialNumber)
    if (!robotDog) {
      logger.warn({ userId, serialNumber }, 'RobotDog not found for adoption (generic key error returned)')
      throw new InvalidRobotDogKeyError()
    }

    let providedKey: RobotDogKey
    try {
      providedKey = RobotDogKey.fromString(key)
    } catch {
      logger.warn({ userId, serialNumber }, 'Malformed robot dog key in AdoptRobotDogUseCase')
      throw new InvalidRobotDogKeyError()
    }

    if (!robotDog.key.equals(providedKey)) {
      logger.warn({ userId, serialNumber }, 'Robot dog key mismatch in AdoptRobotDogUseCase')
      throw new InvalidRobotDogKeyError()
    }

    const alreadyOwner = await this.ownershipReadRepository.isOwner(userId, robotDog.id.value)
    if (alreadyOwner) {
      logger.warn({ userId, serialNumber }, 'User is already an owner of this robot dog')
      throw new OwnershipAlreadyExistsError(userId, robotDog.id.value)
    }

    await this.ownershipWriteRepository.adopt(userId, robotDog.id.value, new Date())

    void OwnershipAssignedEvent.dispatch(userId, robotDog.id.value)

    logger.info({ userId, serialNumber }, 'AdoptRobotDogUseCase completed successfully')
  }
}
