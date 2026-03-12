import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { RobotDogReferenceDto } from '#app/modules/users/ownerships/application/dto/robot-dog-reference.dto'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'

@inject()
export class ListUserRobotDogsUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(userId: string): Promise<RobotDogReferenceDto[]> {
    logger.info({ userId }, 'ListUserRobotDogsUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId }, 'User not found in ListUserRobotDogsUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const robotDogIds = await this.ownershipReadRepository.findActiveDogIdsByUserId(userId)
    const robotDogs = await this.robotDogGateway.findByIds(robotDogIds)
    const usersCountByRobotDogId =
      await this.ownershipReadRepository.countActiveUsersByRobotDogIds(robotDogIds)
    const robotDogsById = new Map(robotDogs.map((robotDog) => [robotDog.id.value, robotDog]))

    const result = robotDogIds.flatMap((robotDogId) => {
      const robotDog = robotDogsById.get(robotDogId)
      if (!robotDog) {
        return []
      }

      return [
        {
          robotDog,
          usersCount: usersCountByRobotDogId[robotDogId] ?? 0,
        },
      ]
    })

    logger.info({ userId, count: result.length }, 'ListUserRobotDogsUseCase completed successfully')
    return result
  }
}
