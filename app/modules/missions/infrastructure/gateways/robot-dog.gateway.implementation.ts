import { RobotDog } from '#app/modules/dogs/domain/robot-dog.entity'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { RobotDogId } from '#dogs/domain/value-objects/robot-dog-id'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import { inject } from '@adonisjs/core'

@inject()
export class RobotDogGatewayImplementation implements RobotDogGateway {
  constructor(private repo: RobotDogRepository) {}

  findBy(id: RobotDogId): Promise<RobotDog | null> {
    return this.repo.findById(id)
  }
}
