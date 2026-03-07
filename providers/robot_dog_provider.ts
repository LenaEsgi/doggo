import type { ApplicationService } from '@adonisjs/core/types'
import { IndexRobotDogsUseCase } from '#dogs/application/contracts/index-robot-dogs.use-case'
import { ShowRobotDogUseCase } from '#dogs/application/contracts/show-robot-dog.use-case'
import { DestroyRobotDogUseCase } from '#dogs/application/contracts/destroy-robot-dog.use-case'
import { UpdateRobotDogUseCase } from '#dogs/application/contracts/update-robot-dog.use-case'
import { UpdateRobotDogUseCaseImplementation } from '#dogs/application/usecases/update-robot-dog.use-case.implementation'
import { DestroyRobotDogUseCaseImplementation } from '#dogs/application/usecases/destroy-robot-dog.use-case.implementation'
import { ShowRobotDogUseCaseImplementation } from '#dogs/application/usecases/show-robot-dog.use-case.implementation'
import { IndexRobotDogsUseCaseImplementation } from '#dogs/application/usecases/index-robot-dogs.use-case.implementation'
import { CreateRobotDogUseCase } from '#dogs/application/contracts/create-robot-dog.use-case'
import { CreateRobotDogUseCaseImplementation } from '#dogs/application/usecases/create-robot-dog.use-case.implementation'

export default class RobotDogProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(CreateRobotDogUseCase, () => {
      return this.app.container.make(CreateRobotDogUseCaseImplementation)
    })

    this.app.container.bind(IndexRobotDogsUseCase, () => {
      return this.app.container.make(IndexRobotDogsUseCaseImplementation)
    })

    this.app.container.bind(ShowRobotDogUseCase, () => {
      return this.app.container.make(ShowRobotDogUseCaseImplementation)
    })

    this.app.container.bind(DestroyRobotDogUseCase, () => {
      return this.app.container.make(DestroyRobotDogUseCaseImplementation)
    })

    this.app.container.bind(UpdateRobotDogUseCase, () => {
      return this.app.container.make(UpdateRobotDogUseCaseImplementation)
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
