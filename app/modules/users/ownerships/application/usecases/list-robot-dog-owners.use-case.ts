import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import type { UserReferenceDto } from '#app/modules/users/ownerships/application/dto/user-reference.dto'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { RobotDogNotFoundError } from '#dogs/domain/exceptions/robot-dog-not-found.error'
import { PaginatedResult } from '#app/modules/share/DTO/paginated-result.dto'
import { PaginationDto } from '#app/modules/share/DTO/pagination.dto'

@inject()
export class ListRobotDogOwnersUseCase {
  constructor(
    private readonly robotDogGateway: RobotDogOwnershipGateway,
    private readonly userGateway: UserOwnershipGateway,
    private readonly ownershipReadRepository: OwnershipReadRepository
  ) {}

  async execute(
    robotDogId: string,
    params: PaginationDto
  ): Promise<PaginatedResult<UserReferenceDto>> {
    logger.info({ robotDogId }, 'ListRobotDogOwnersUseCase started')

    const robotDogExists = await this.robotDogGateway.existsById(robotDogId)
    if (!robotDogExists) {
      logger.warn({ robotDogId }, 'RobotDog not found in ListRobotDogOwnersUseCase')
      throw new RobotDogNotFoundError(robotDogId)
    }

    const paginateUsers = await this.ownershipReadRepository.findActiveUserIdsByRobotDogId(
      robotDogId,
      params
    )

    const users = await this.userGateway.findByIds(paginateUsers.data)
    const dogsCountByUserId = await this.ownershipReadRepository.countActiveDogsByUserIds(
      paginateUsers.data
    )
    const usersById = new Map(users.map((user) => [user.id, user]))

    const result = paginateUsers.data.flatMap((userId) => {
      const user = usersById.get(userId)
      if (!user) {
        return []
      }

      return [
        {
          user,
          dogsCount: dogsCountByUserId[userId] ?? 0,
        },
      ]
    })

    logger.info(
      { robotDogId, count: result.length },
      'ListRobotDogOwnersUseCase completed successfully'
    )

    return {
      meta: paginateUsers.meta,
      data: result,
    }
  }
}
