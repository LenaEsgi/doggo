import { ApplicationService } from '@adonisjs/core/types'
import { AuthService } from '#auth/application/contracts/auth.service'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'
import { CreateUserService } from '#users/application/contracts/create.user.service'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import { IndexUserService } from '#users/application/contracts/index.user.service'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  public async register() {
    const { AuthServiceImplementation } =
      await import('#auth/application/services/auth.service.implementation')
    const { FirebaseAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_auth.provider')
    const { LocalUserRepositoryImplementation } =
      await import('#auth/infrastructure/repositories/local_user.repository')
    const { CreateUser } = await import('#users/application/services/create.user.service')
    const { DeleteUser } = await import('#users/application/services/delete.user.service')
    const { IndexUser } = await import('#users/application/services/index.user.service')
    const { ShowUser } = await import('#users/application/services/show.user.service')
    const { UpdateUser } = await import('#users/application/services/update.user.service')
    const { UserRepositoryImplementation } =
      await import('#users/infrastructure/database/repositories/user.repository.implementation')
    this.app.container.bind(AuthProvider, () => {
      return this.app.container.make(FirebaseAuthProvider)
    })

    this.app.container.bind(UserReadRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(UserWriteRepository, () => {
      return this.app.container.make(UserRepositoryImplementation)
    })

    this.app.container.bind(LocalUserRepository, () => {
      return this.app.container.make(LocalUserRepositoryImplementation)
    })

    this.app.container.bind(AuthService, () => {
      return this.app.container.make(AuthServiceImplementation)
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
}
