import { ApplicationService } from '@adonisjs/core/types'
import { DeleteAccountAuthService } from '#auth/application/contracts/delete.account.auth.service'
import { DisableMfaAuthService } from '#auth/application/contracts/disable.mfa.auth.service'
import { FinalizeTotpSetupAuthService } from '#auth/application/contracts/finalize.totp.setup.auth.service'
import { ListMfaEnrollmentsAuthService } from '#auth/application/contracts/list.mfa.enrollments.auth.service'
import { LoginAuthService } from '#auth/application/contracts/login.auth.service'
import { LoginWithTotpAuthService } from '#auth/application/contracts/login.with.totp.auth.service'
import { PasswordResetAuthService } from '#auth/application/contracts/password.reset.auth.service'
import { RegisterAuthService } from '#auth/application/contracts/register.auth.service'
import { StartTotpSetupAuthService } from '#auth/application/contracts/start.totp.setup.auth.service'
import { AuthProvider } from '#auth/domain/contracts/auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local_user.repository'
import { CreateUserService } from '#users/application/contracts/create.user.service'
import { DeleteUserService } from '#users/application/contracts/delete.user.service'
import { IndexUserService } from '#users/application/contracts/index.user.service'
import { ShowUserService } from '#users/application/contracts/show.user.service'
import { UpdateUserService } from '#users/application/contracts/update.user.service'
import { UserReadRepository } from '#users/domain/contracts/user.read.repository'
import { UserWriteRepository } from '#users/domain/contracts/user.write.repository'
import { RobotDogRepository } from '#dogs/domain/contracts/robot-dog.repository'
import { CreateRobotDogUseCase } from '../app/modules/dogs/application/contracts/create-robot-dog.use-case.js'
import { IndexRobotDogsUseCase } from '../app/modules/dogs/application/contracts/index-robot-dogs.use-case.js'
import { ShowRobotDogUseCase } from '../app/modules/dogs/application/contracts/show-robot-dog.use-case.js'
import { DestroyRobotDogUseCase } from '../app/modules/dogs/application/contracts/destroy-robot-dog.use-case.js'
import { UpdateRobotDogUseCase } from '../app/modules/dogs/application/contracts/update-robot-dog.use-case.js'
import { RobotDogRepositoryImplementation } from '#dogs/infrastructure/database/repositories/robot-dog.repository.implementation'
import { LocalUserRepositoryImplementation } from '#auth/infrastructure/database/repositories/local_user.repository'
import { CreateMissionUseCase } from '#app/modules/missions/application/contracts/create-mission.use-case'
import {
  CreateMissionUseCaseImplementation
} from '#app/modules/missions/application/usecases/create-mission.use-case.implementation'
import { RobotDogGateway } from '#app/modules/missions/application/contracts/robot-dog.gateway'
import {
  RobotDogGatewayImplementation
} from '#app/modules/missions/infrastructure/gateways/robot-dog.gateway.implementation'
import { UserGateway } from '#app/modules/missions/application/contracts/user.gateway'
import { UserGatewayImplementation } from '#app/modules/missions/infrastructure/gateways/user.gateway.implementation'
import { MissionRepository } from '#app/modules/missions/domain/contracts/mission.repository'
import {
  MissionRepositoryImplementation
} from '#app/modules/missions/infrastructure/database/repositories/mission.repository.implementation'
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

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  public async register() {
    const { DeleteAccountAuth } =
      await import('#auth/application/services/delete.account.auth.service')
    const { DisableMfaAuth } = await import('#auth/application/services/disable.mfa.auth.service')
    const { FinalizeTotpSetupAuth } =
      await import('#auth/application/services/finalize.totp.setup.auth.service')
    const { ListMfaEnrollmentsAuth } =
      await import('#auth/application/services/list.mfa.enrollments.auth.service')
    const { LoginAuth } = await import('#auth/application/services/login.auth.service')
    const { LoginWithTotpAuth } =
      await import('#auth/application/services/login.with.totp.auth.service')
    const { PasswordResetAuth } =
      await import('#auth/application/services/password.reset.auth.service')
    const { RegisterAuth } = await import('#auth/application/services/register.auth.service')
    const { StartTotpSetupAuth } =
      await import('#auth/application/services/start.totp.setup.auth.service')
    const { FirebaseAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_auth.provider')
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
    /**
     * The container bindings have booted
     */
    this.app.container.bind(RegisterAuthService, () => {
      return this.app.container.make(RegisterAuth)
    })
    this.app.container.bind(RobotDogRepository, () => {
      return this.app.container.make(RobotDogRepositoryImplementation)
    })

    this.app.container.bind(LoginAuthService, () => {
      return this.app.container.make(LoginAuth)
    })
    const { CreateRobotDogUseCaseImplementation } =
      await import('../app/modules/dogs/application/usecases/create-robot-dog.use-case.implementation.js')
    this.app.container.bind(CreateRobotDogUseCase, () => {
      return this.app.container.make(CreateRobotDogUseCaseImplementation)
    })

    this.app.container.bind(LoginWithTotpAuthService, () => {
      return this.app.container.make(LoginWithTotpAuth)
    })
    const { IndexRobotDogsUseCaseImplementation } =
      await import('../app/modules/dogs/application/usecases/index-robot-dogs.use-case.implementation.js')
    this.app.container.bind(IndexRobotDogsUseCase, () => {
      return this.app.container.make(IndexRobotDogsUseCaseImplementation)
    })

    this.app.container.bind(PasswordResetAuthService, () => {
      return this.app.container.make(PasswordResetAuth)
    })
    const { ShowRobotDogUseCaseImplementation } =
      await import('../app/modules/dogs/application/usecases/show-robot-dog.use-case.implementation.js')
    this.app.container.bind(ShowRobotDogUseCase, () => {
      return this.app.container.make(ShowRobotDogUseCaseImplementation)
    })

    this.app.container.bind(StartTotpSetupAuthService, () => {
      return this.app.container.make(StartTotpSetupAuth)
    })
    const { DestroyRobotDogUseCaseImplementation } =
      await import('../app/modules/dogs/application/usecases/destroy-robot-dog.use-case.implementation.js')
    this.app.container.bind(DestroyRobotDogUseCase, () => {
      return this.app.container.make(DestroyRobotDogUseCaseImplementation)
    })

    this.app.container.bind(FinalizeTotpSetupAuthService, () => {
      return this.app.container.make(FinalizeTotpSetupAuth)
    })
    const { UpdateRobotDogUseCaseImplementation } =
      await import('../app/modules/dogs/application/usecases/update-robot-dog.use-case.implementation.js')
    this.app.container.bind(UpdateRobotDogUseCase, () => {
      return this.app.container.make(UpdateRobotDogUseCaseImplementation)
    })

    this.app.container.bind(ListMfaEnrollmentsAuthService, () => {
      return this.app.container.make(ListMfaEnrollmentsAuth)
    })

    this.app.container.bind(DisableMfaAuthService, () => {
      return this.app.container.make(DisableMfaAuth)
    })

    this.app.container.bind(DeleteAccountAuthService, () => {
      return this.app.container.make(DeleteAccountAuth)
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


    // MISSIONS
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
}
