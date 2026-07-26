import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'

@inject()
export default class MissionPolicy extends BasePolicy {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly ownershipRepository: OwnershipReadRepository
  ) {
    super()
  }

  create(_user: User): AuthorizerResponse {
    return true
  }

  index(user: User): AuthorizerResponse {
    return user.role === UserRole.ADMIN
  }

  indexMine(_user: User): AuthorizerResponse {
    return true
  }

  async show(user: User, missionId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async update(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async destroy(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async syncSteps(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async listByDog(user: User, dogId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    return this.ownershipRepository.isOwner(user.id, dogId)
  }

  async assignToDog(user: User, dogId: string, missionId: string): Promise<AuthorizerResponse> {
    const [ownsDog, ownsMission] = await Promise.all([
      this.ownershipRepository.isOwner(user.id, dogId),
      this.missionRepository.isOwner(user.id, missionId),
    ])
    return ownsDog && ownsMission
  }

  async removeFromDog(user: User, dogId: string, _missionId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, dogId)
  }

  async createSchedule(
    user: User,
    missionId: string,
    robotDogId: string
  ): Promise<AuthorizerResponse> {
    if (await this.missionRepository.isOwner(user.id, missionId)) return true
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }

  async manageSchedule(user: User, missionId: string): Promise<AuthorizerResponse> {
    return this.missionRepository.isOwner(user.id, missionId)
  }

  async viewSchedule(user: User, missionId: string): Promise<AuthorizerResponse> {
    if (await this.missionRepository.isOwner(user.id, missionId)) return true

    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false

    const ownershipChecks = await Promise.all(
      mission.robotDogIds.map((dogId) => this.ownershipRepository.isOwner(user.id, dogId.value))
    )
    return ownershipChecks.some(Boolean)
  }

  async downloadReport(user: User, robotDogId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    return this.ownershipRepository.isOwner(user.id, robotDogId)
  }
}
