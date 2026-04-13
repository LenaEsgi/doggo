import { inject } from '@adonisjs/core'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import type { RobotDog } from '#dogs/domain/robot-dog.entity'

@inject()
export class RobotDogOwnershipGatewayImplementation extends RobotDogOwnershipGateway {
  constructor(private readonly robotDogRepository: RobotDogRepository) {
    super()
  }

  async findBySerialNumber(serialNumber: string): Promise<RobotDog | null> {
    return await this.robotDogRepository.findBySerialNumber(serialNumber)
  }

  async existsById(robotDogId: string): Promise<boolean> {
    return (await this.robotDogRepository.findById(RobotDogId.fromString(robotDogId))) !== null
  }

  async findByIds(ids: string[]): Promise<RobotDog[]> {
    return this.robotDogRepository.findByIds(ids)
  }
}
