import type { ApplicationService } from '@adonisjs/core/types'
import { CreateUserService } from '#users/application/contracts/create.user.service'
import { IndexUserService } from '#users/application/contracts/index.user.service'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import { CreateUser } from '#users/application/services/create.user.service'
import { IndexUser } from '#users/application/services/index.user.service'
import { ShowUser } from '#users/application/services/show.user.service'
import { UpdateUser } from '#users/application/services/update.user.service'
import { DeleteUser } from '#users/application/services/delete.user.service'
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

    this.app.container.bind(CreateUserService, () => {
      return this.app.container.make(CreateUser)
    })

    this.app.container.bind(IndexUserService, () => {
      return this.app.container.make(IndexUser)
    })

    this.app.container.bind(ShowUserService, () => {
      return this.app.container.make(ShowUser)
    })

    this.app.container.bind(UpdateUserService, () => {
      return this.app.container.make(UpdateUser)
    })

    this.app.container.bind(DeleteUserService, () => {
      return this.app.container.make(DeleteUser)
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
