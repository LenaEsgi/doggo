import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import { type User } from '#users/domain/user.entity'
import { UserRole } from '#users/domain/enums/user.role'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import { MissionId } from '#app/modules/missions/domain/value-objects/mission-id'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'

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

  async index(_user: User): Promise<AuthorizerResponse> {
    return true
  }

  async show(user: User, missionId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async update(user: User, missionId: string): Promise<AuthorizerResponse> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async destroy(user: User, missionId: string): Promise<AuthorizerResponse> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async addStep(user: User, missionId: string): Promise<AuthorizerResponse> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async removeStep(user: User, missionId: string): Promise<AuthorizerResponse> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async moveStep(user: User, missionId: string): Promise<AuthorizerResponse> {
    const mission = await this.missionRepository.findById(MissionId.fromString(missionId))
    if (!mission) return false
    return mission.userId === user.id
  }

  async listByDog(user: User, dogId: string): Promise<AuthorizerResponse> {
    if (user.role === UserRole.ADMIN) return true
    return this.ownershipRepository.isOwner(user.id, dogId)
  }

  async assignToDog(user: User, dogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, dogId)
  }

  async removeFromDog(user: User, dogId: string): Promise<AuthorizerResponse> {
    return this.ownershipRepository.isOwner(user.id, dogId)
  }
}
