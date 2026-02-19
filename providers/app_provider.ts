import type { ApplicationService } from '@adonisjs/core/types'
import { RobotDogRepository } from '../app/modules/dogs/domain/contracts/robot_dog.repository.js'
import { CreateRobotDogUseCase } from '../app/modules/dogs/application/contracts/create-robot-dog.use-case.js'
import { IndexRobotDogsUseCase } from '../app/modules/dogs/application/contracts/index-robot-dogs.use-case.js'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const { RobotDogRepositoryImplementation } = await import('../app/modules/dogs/infrastructure/database/repositories/robot_dog.repository.implementation.js')

    this.app.container.bind(RobotDogRepository, () => {
      return this.app.container.make(RobotDogRepositoryImplementation)
    })

    const { CreateRobotDogUseCaseImplementation } = await import('../app/modules/dogs/application/usecases/create-robot-dog.use-case.implementation.js')
    this.app.container.bind(CreateRobotDogUseCase, () => {
      return this.app.container.make(CreateRobotDogUseCaseImplementation)
    })

    const { IndexRobotDogsUseCaseImplementation } = await import('../app/modules/dogs/application/usecases/index-robot-dogs.use-case.implementation.js')
    this.app.container.bind(IndexRobotDogsUseCase, () => {
      return this.app.container.make(IndexRobotDogsUseCaseImplementation)
    })
  }

  /**
   * The application has been booted
   */
  async start() {
  }

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
