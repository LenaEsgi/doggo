import type { ApplicationService } from '@adonisjs/core/types'
import { RobotDogOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/robot-dog-ownership.gateway'
import { UserOwnershipGateway } from '#app/modules/users/ownerships/application/gateways/user-ownership.gateway'
import { OwnershipReadRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.read.repository'
import { OwnershipWriteRepository } from '#app/modules/users/ownerships/domain/contracts/ownership.write.repository'
import { OwnershipRepositoryImplementation } from '#app/modules/users/ownerships/infrastructure/database/repositories/ownership.repository.implementation'
import { RobotDogOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/robot-dog-ownership.gateway.implementation'
import { UserOwnershipGatewayImplementation } from '#app/modules/users/ownerships/infrastructure/gateways/user-ownership.gateway.implementation'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { UserRepositoryImplementation } from '#users/infrastructure/database/repositories/user.repository.implementation'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import { LocalUserRepositoryImplementation } from '#auth/infrastructure/database/repositories/local-user.repository'

export default class UserProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(UserReadRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(UserWriteRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(LocalUserRepository, () => {
      return this.app.container.make(LocalUserRepositoryImplementation)
    })

    this.app.container.bind(UserOwnershipGateway, () => {
      return this.app.container.make(UserOwnershipGatewayImplementation)
    })

    this.app.container.bind(RobotDogOwnershipGateway, () => {
      return this.app.container.make(RobotDogOwnershipGatewayImplementation)
    })

    this.app.container.bind(OwnershipReadRepository, () => {
      return this.app.container.make(OwnershipRepositoryImplementation)
    })

    this.app.container.bind(OwnershipWriteRepository, () => {
      return this.app.container.make(OwnershipRepositoryImplementation)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
