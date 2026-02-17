import { ApplicationService } from '@adonisjs/core/types'
import { AuthService } from '#auth/application/contracts/auth.service'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'

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

    this.app.container.bind(AuthProvider, () => {
      return this.app.container.make(FirebaseAuthProvider)
    })

    this.app.container.bind(LocalUserRepository, () => {
      return this.app.container.make(LocalUserRepositoryImplementation)
    })

    this.app.container.bind(AuthService, () => {
      return this.app.container.make(AuthServiceImplementation)
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
