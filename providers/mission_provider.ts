import type { ApplicationService } from '@adonisjs/core/types'
import { CreateMissionUseCase } from '#app/modules/missions/application/contracts/create-mission.use-case'
import {
  CreateMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/create-mission.use-case.implementation'
import { ShowMissionUseCase } from '#app/modules/missions/application/contracts/show-mission.use-case'
import {
  ShowMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/show-mission.use-case.implementation'
import { IndexMissionUseCase } from '#app/modules/missions/application/contracts/index-mission.use-case'
import {
  IndexMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/index-mission.use-case.implementation'
import { UpdateMissionUseCase } from '#app/modules/missions/application/contracts/update-mission.use-case'
import {
  UpdateMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/update-mission.use-case.implementation'
import { DestroyMissionUseCase } from '#app/modules/missions/application/contracts/destroy-mission.use-case'
import {
  DestroyMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/destroy-mission.use-case.implementation'
import { AddMissionStepUseCase } from '#app/modules/missions/application/contracts/add-mission-step.use-case'
import {
  AddMissionStepUseCaseImplementation
} from '#app/modules/missions/application/usecases/add-mission-step.use-case.implementation'
import { RemoveMissionStepUseCase } from '#app/modules/missions/application/contracts/remove-mission-step.use-case'
import RemoveMissionStepImplementation
  from '#app/modules/missions/application/usecases/remove-mission-step.use-case.implementation'
import { MoveMissionStepUseCase } from '#app/modules/missions/application/contracts/move-mission-step.use-case'
import {
  MoveMissionStepUseCaseImplementation
} from '#app/modules/missions/application/usecases/move-mission-step.use-case.implementation'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import {
  MissionRepositoryImplementation
} from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import {
  RobotDogGatewayImplementation
} from '#app/modules/missions/infrastructure/gateways/robot-dog.gateway.implementation'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import { UserGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/user.gateway.implementation'

export default class MissionProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(CreateMissionUseCase, () => {
      return this.app.container.make(CreateMissionUseCaseImplementation)
    })

    this.app.container.bind(ShowMissionUseCase, () => {
      return this.app.container.make(ShowMissionUseCaseImplementation)
    })

    this.app.container.bind(IndexMissionUseCase, () => {
      return this.app.container.make(IndexMissionUseCaseImplementation)
    })

    this.app.container.bind(UpdateMissionUseCase, () => {
      return this.app.container.make(UpdateMissionUseCaseImplementation)
    })

    this.app.container.bind(DestroyMissionUseCase, () => {
      return this.app.container.make(DestroyMissionUseCaseImplementation)
    })

    this.app.container.bind(AddMissionStepUseCase, () => {
      return this.app.container.make(AddMissionStepUseCaseImplementation)
    })

    this.app.container.bind(RemoveMissionStepUseCase, () => {
      return this.app.container.make(RemoveMissionStepImplementation)
    })

    this.app.container.bind(MoveMissionStepUseCase, () => {
      return this.app.container.make(MoveMissionStepUseCaseImplementation)
    })

    this.app.container.bind(MissionRepository, () => {
      return this.app.container.make(MissionRepositoryImplementation)
    })

    this.app.container.bind(RobotDogGateway, () => {
      return this.app.container.make(RobotDogGatewayImplementation)
    })

    this.app.container.bind(UserGateway, () => {
      return this.app.container.make(UserGatewayImplementation)
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
