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
import { DeleteAccountAuthProvider } from '#auth/domain/contracts/delete.account.auth.provider'
import { DisableMfaAuthProvider } from '#auth/domain/contracts/disable.mfa.auth.provider'
import { FinalizeTotpSetupAuthProvider } from '#auth/domain/contracts/finalize.totp.setup.auth.provider'
import { ListMfaEnrollmentsAuthProvider } from '#auth/domain/contracts/list.mfa.enrollments.auth.provider'
import { LoginAuthProvider } from '#auth/domain/contracts/login.auth.provider'
import { LoginWithTotpAuthProvider } from '#auth/domain/contracts/login.with.totp.auth.provider'
import { PasswordResetAuthProvider } from '#auth/domain/contracts/password.reset.auth.provider'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { StartTotpSetupAuthProvider } from '#auth/domain/contracts/start.totp.setup.auth.provider'
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
    const { FirebaseRegisterAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_register_auth.provider')
    const { FirebaseLoginAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_login_auth.provider')
    const { FirebaseLoginWithTotpAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_login_with_totp_auth.provider')
    const { FirebasePasswordResetAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_password_reset_auth.provider')
    const { FirebaseStartTotpSetupAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_start_totp_setup_auth.provider')
    const { FirebaseFinalizeTotpSetupAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_finalize_totp_setup_auth.provider')
    const { FirebaseListMfaEnrollmentsAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_list_mfa_enrollments_auth.provider')
    const { FirebaseDisableMfaAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_disable_mfa_auth.provider')
    const { FirebaseDeleteAccountAuthProvider } =
      await import('#auth/infrastructure/providers/firebase_delete_account_auth.provider')
    const { CreateUser } = await import('#users/application/services/create.user.service')
    const { DeleteUser } = await import('#users/application/services/delete.user.service')
    const { IndexUser } = await import('#users/application/services/index.user.service')
    const { ShowUser } = await import('#users/application/services/show.user.service')
    const { UpdateUser } = await import('#users/application/services/update.user.service')
    const { UserRepositoryImplementation } =
      await import('#users/infrastructure/database/repositories/user.repository.implementation')
    this.app.container.bind(RegisterAuthProvider, () => {
      return this.app.container.make(FirebaseRegisterAuthProvider)
    })
    this.app.container.bind(LoginAuthProvider, () => {
      return this.app.container.make(FirebaseLoginAuthProvider)
    })
    this.app.container.bind(LoginWithTotpAuthProvider, () => {
      return this.app.container.make(FirebaseLoginWithTotpAuthProvider)
    })
    this.app.container.bind(PasswordResetAuthProvider, () => {
      return this.app.container.make(FirebasePasswordResetAuthProvider)
    })
    this.app.container.bind(StartTotpSetupAuthProvider, () => {
      return this.app.container.make(FirebaseStartTotpSetupAuthProvider)
    })
    this.app.container.bind(FinalizeTotpSetupAuthProvider, () => {
      return this.app.container.make(FirebaseFinalizeTotpSetupAuthProvider)
    })
    this.app.container.bind(ListMfaEnrollmentsAuthProvider, () => {
      return this.app.container.make(FirebaseListMfaEnrollmentsAuthProvider)
    })
    this.app.container.bind(DisableMfaAuthProvider, () => {
      return this.app.container.make(FirebaseDisableMfaAuthProvider)
    })
    this.app.container.bind(DeleteAccountAuthProvider, () => {
      return this.app.container.make(FirebaseDeleteAccountAuthProvider)
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
  }
}
