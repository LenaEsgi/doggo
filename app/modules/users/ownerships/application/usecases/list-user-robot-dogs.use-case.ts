import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { RobotDogReferenceDto } from '#app/modules/users/ownerships/application/dto/robot-dog-reference.dto'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { InvalidUserNotFoundError } from '#users/domain/exceptions/invalid-user-not-found.error'
import { type PaginationDto } from '#app/modules/share/DTO/pagination.dto'
import { type PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'

@inject()
export class ListUserRobotDogsUseCase {
  constructor(
    private readonly userGateway: UserOwnershipGateway,
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(
    userId: string,
    options?: PaginationDto
  ): Promise<PaginatedResult<RobotDogReferenceDto>> {
    logger.info({ userId }, 'ListUserRobotDogsUseCase started')

    const userExists = await this.userGateway.existsById(userId)
    if (!userExists) {
      logger.warn({ userId }, 'User not found in ListUserRobotDogsUseCase')
      throw new InvalidUserNotFoundError(userId)
    }

    const { data: robotDogIds, meta } = await this.ownershipReadRepository.findActiveDogIdsByUserId(
      userId,
      options
    )
    const robotDogs = await this.robotDogGateway.findByIds(robotDogIds)
    const usersCountByRobotDogId =
      await this.ownershipReadRepository.countActiveUsersByRobotDogIds(robotDogIds)
    const robotDogsById = new Map(robotDogs.map((robotDog) => [robotDog.id.value, robotDog]))

    const data = robotDogIds.flatMap((robotDogId) => {
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

    logger.info({ userId, count: data.length }, 'ListUserRobotDogsUseCase completed successfully')
    return { data, meta }
  }
}
