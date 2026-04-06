import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { type GoogleLoginDto } from '#auth/application/dto/google-login.dto'
import { GoogleLoginAuthProvider } from '#auth/domain/contracts/google.login.auth.provider'
import { LocalUserRepository } from '#auth/domain/contracts/local-user.repository'
import type { GoogleUserInfo } from '#auth/domain/contracts/google.login.auth.provider'

@inject()
export class GoogleLoginAuthUseCase {
  constructor(
    private readonly authProvider: GoogleLoginAuthProvider,
    private readonly localUserRepository: LocalUserRepository
  ) {}

  async execute(payload: GoogleLoginDto): Promise<GoogleUserInfo> {
    logger.info('GoogleLoginAuthUseCase started')

    const userInfo = await this.authProvider.verifyGoogleToken(payload.idToken)

    await this.localUserRepository.ensureUserProfile({
      firebaseUid: userInfo.uid,
      firstname: userInfo.firstname,
      lastname: userInfo.lastname,
      email: userInfo.email,
    })

    logger.info(
      { uid: userInfo.uid, email: userInfo.email },
      'GoogleLoginAuthUseCase completed successfully'
    )

    return userInfo
  }
}
