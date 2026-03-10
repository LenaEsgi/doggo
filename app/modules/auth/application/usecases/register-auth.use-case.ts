import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type RegisterDto } from '#auth/application/dto/register.dto'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import { RegisterAuthProvider } from '#auth/domain/contracts/register.auth.provider'
import { type AuthTokens } from '#auth/domain/types/auth.tokens'

@inject()
export class RegisterAuthUseCase {
  constructor(
    private readonly authProvider: RegisterAuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async execute(payload: RegisterDto): Promise<AuthTokens> {
    logger.info({ email: payload.email }, 'RegisterAuthUseCase started')
    const authUser = await this.authProvider.register(payload.email, payload.password)

    await this.localUserRepository.ensureUserProfile({
      firebaseUid: authUser.localId,
      firstname: payload.firstname,
      lastname: payload.lastname,
      email: payload.email,
    })

    logger.info(
      { firebaseUid: authUser.localId, email: payload.email },
      'RegisterAuthUseCase completed successfully'
    )

    return authUser
  }
}
